import { AnalyticsService } from './analyticsService';
import { prisma } from '../prisma';

// ── Context categories — determines which data we fetch per query ─────────────
type ContextCategory = 'revenue' | 'staff' | 'customers' | 'inventory' | 'appointments';

// ── Strict type for context data passed to Groq ───────────────────────────────
interface SalonContextData {
  revenue?: { total: number; noShowRate: number };
  appointments?: { total: number; completed: number; noShows: number };
  staff?: Array<{
    name: string;
    role: string;
    rating: number;
    rebookRate: string;
    revenueGenerated: string;
  }>;
  churnRisk?: {
    highRiskCount: number;
    topAtRisk: Array<{
      name: string;
      ltv: string;
      daysOverdue: number;
      riskScore: string;
    }>;
  };
  inventory?: Array<{
    product: string;
    stock: number;
    daysLeft: number;
    alert: string | null;
  }>;
}

// ── Type for daily briefing response ─────────────────────────────────────────
interface DailyBriefing {
  greeting: string;
  recommendations: string[];
}

function determineContext(query: string): ContextCategory[] {
  const q = query.toLowerCase();
  const categories: ContextCategory[] = [];

  if (/revenue|money|profit|earn|income|sales|£|\$|payment|week|month|financial/.test(q))
    categories.push('revenue');
  if (/staff|stylist|team|employee|barber|who|performance|rebook|rating|best|worst|chair/.test(q))
    categories.push('staff');
  if (/customer|client|retention|churn|return|contact|loyalty|cold|overdue|lost/.test(q))
    categories.push('customers');
  if (/stock|inventory|product|supply|reorder|toner|shampoo|serum|item|low/.test(q))
    categories.push('inventory');
  if (/appointment|booking|no.show|cancel|scheduled|today|upcoming|visit/.test(q))
    categories.push('appointments');

  // Default: fetch revenue + appointments if no specific category matched
  if (categories.length === 0) categories.push('revenue', 'appointments');

  return categories;
}

// ── Strict base system prompt ─────────────────────────────────────────────────
const SYSTEM_PROMPT_BASE = `You are an expert business advisor for an independent hair salon.

RULES — follow these without exception:
1. Answer using ONLY the business context data supplied below. Never invent, estimate, or assume facts not present in the data.
2. Never fabricate financial figures, customer names, staff metrics, inventory quantities, or appointment details.
3. If the data needed to answer the question is not present in the supplied context, clearly say: "I don't have [topic] data connected yet, so I'm unable to answer that from the current salon data."
4. Distinguish clearly between hard facts (from the data) and your recommendations (labelled as suggestions).
5. Be concise, direct, and conversational — like a sharp business consultant, not a report generator.
6. Do NOT refer to yourself as an AI or LLM. You are the salon's business advisor.

RESPONSE FORMAT:
- Plain text paragraphs. No markdown headers, no bullet lists unless listing specific items.
- Max 4 sentences for simple questions. Max 8 sentences for complex analysis.`;

export const AIService = {

  // ── Daily AI Briefing ─────────────────────────────────────────────────────
  async generateDailyBriefing(salonId: string, ownerName: string): Promise<DailyBriefing> {
    // 1. Gather all strictly deterministic data first
    const overview = await AnalyticsService.getOverview(salonId);

    // Quick inventory check for context
    const inventory = await prisma.inventory.findMany({
      where: { salonId, daysLeft: { lte: 7 } },
      include: { product: true }
    });

    const highRiskAppts = overview.appointments.noShows;

    // 2. Build the strict context payload (facts only)
    const contextFacts = {
      revenue: overview.revenue,
      appointmentsToday: overview.appointments.total,
      highRiskCancellations: highRiskAppts,
      lowStockItemsCount: inventory.length,
      lowStockItemNames: inventory.map(i => i.product.name).join(', ')
    };

    // 3. Fallback if no API Key is provided (prevents crashes during demo)
    const apiKey = process.env.GROQ_API_KEY;
    console.log('[AI] GROQ_API_KEY present:', !!apiKey, '| Length:', apiKey?.length);
    if (!apiKey) {
      return {
        greeting: `Good morning, ${ownerName}.`,
        recommendations: [
          contextFacts.highRiskCancellations > 0
            ? `Confirm your ${contextFacts.highRiskCancellations} risky appointments.`
            : 'No risky appointments today.',
          contextFacts.lowStockItemsCount > 0
            ? `Restock ${contextFacts.lowStockItemsCount} items (including ${contextFacts.lowStockItemNames.split(',')[0]}).`
            : 'Inventory is healthy.',
          'Focus on driving retail sales to boost revenue.'
        ]
      };
    }

    // 4. Call Groq — use fast qwen model for briefings (~0.5s)
    try {
      const prompt = `You are a sharp salon business advisor giving a morning briefing to ${ownerName}.
Today: Revenue £${contextFacts.revenue} | Appointments: ${contextFacts.appointmentsToday} | High-risk no-shows: ${contextFacts.highRiskCancellations} | Low stock: ${contextFacts.lowStockItemNames || 'none'}.
Return ONLY this JSON: {"greeting": "one sharp sentence", "recommendations": ["tip1","tip2","tip3"]}
Tips must be specific, actionable, and grounded in today's data only.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: 'Generate now.' }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4,
          max_tokens: 1000
        })
      });

      console.log('[AI] Groq response status:', response.status);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API Error: ${response.status} - ${errText}`);
      }

      const result = await response.json() as { choices: Array<{ message: { content: string } }> };
      const contentText = result.choices[0].message.content;
      console.log('[AI] Groq raw content:', contentText);

      const parsed = JSON.parse(contentText) as DailyBriefing;
      console.log('[AI] Parsed briefing:', JSON.stringify(parsed));
      return parsed;

    } catch (error: unknown) {
      console.error('[AI] Groq call failed:', (error as Error)?.message ?? String(error));
      return {
        greeting: `Good morning, ${ownerName}. (Offline Mode)`,
        recommendations: [
          'Please verify your GROQ_API_KEY.',
          'Check upcoming appointments for no-show risk.',
          'Review inventory levels manually.'
        ]
      };
    }
  },

  // ── Dynamic AI Advisor with Conversation History & Complete Salon Context ──
  async askAdvisor(
    salonId: string,
    ownerName: string,
    query: string,
    history: Array<{ role: 'user' | 'ai'; text: string }> = []
  ): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return 'The AI advisor is currently offline — GROQ_API_KEY is not configured. Please contact your administrator.';
    }

    // Fetch complete live salon data to guarantee zero missing context (Customer Churn, Revenue, Staff, Inventory, No-Shows)
    const [overview, staffPerf, churnRisk, inventoryData, noShowData, recentNoShows] = await Promise.all([
      AnalyticsService.getOverview(salonId),
      AnalyticsService.getStaffPerformance(salonId),
      AnalyticsService.getChurnRisk(salonId),
      prisma.inventory.findMany({
        where: { salonId },
        include: { product: true },
        orderBy: { daysLeft: 'asc' }
      }),
      AnalyticsService.getNoShowPrediction(salonId),
      prisma.appointment.findMany({
        where: { salonId, status: 'NO_SHOW' },
        include: {
          customer: { select: { name: true, phone: true, email: true, ltv: true } },
          staff: { select: { name: true } },
          services: { select: { priceAtBooking: true, service: { select: { name: true } } } },
        },
        orderBy: { date: 'desc' },
        take: 15,
      }),
    ]);

    const anchor = overview.anchorDate ? new Date(overview.anchorDate) : new Date();
    const activeReportingPeriod = anchor.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const todayFormatted = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const contextParts = {
      salonOverview: {
        salonOwner: ownerName,
        currentDate: todayFormatted,
        activeReportingPeriod: activeReportingPeriod,
      },
      financials: {
        reportingPeriod: activeReportingPeriod,
        currentMonthRevenue: `£${overview.revenue}`,
        noShowRate: `${overview.noShowRate}%`,
        appointmentsBooked: overview.appointments.total,
        appointmentsCompleted: overview.appointments.completed,
        appointmentsNoShows: overview.appointments.noShows,
        utilisationRate: `${overview.utilisationRate}%`
      },
      recentNoShowClients: recentNoShows.slice(0, 5).map(n => ({
        name: n.customer?.name || 'Unknown',
        date: new Date(n.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        stylist: n.staff?.name || 'Unassigned',
        service: n.services[0]?.service?.name || 'Service',
        lostValue: `£${n.services.reduce((sum, s) => sum + s.priceAtBooking, 0)}`,
        phone: n.customer?.phone || 'N/A',
      })),
      atRiskCustomers: churnRisk.slice(0, 5).map(c => ({
        name: c.name,
        lifetimeValue: `£${c.ltv}`,
        daysOverdue: c.daysOverdue,
        riskScore: `${c.risk}%`,
      })),
      staffPerformance: staffPerf.map(s => ({
        name: s.name,
        role: s.role,
        rating: s.rating,
        rebookRate: `${s.rebookRate}%`,
        revenue: `£${s.generatedRevenue}`
      })),
      lowStockInventory: inventoryData.filter(i => i.stock <= 5).map(i => ({
        product: i.product.name,
        stock: i.stock,
      }))
    };

    const contextStr = JSON.stringify(contextParts, null, 2);

    const systemPrompt = `You are an executive Salon Business Advisor for ${ownerName}'s salon.

RULES:
1. Ground ALL facts directly in the live database context below.
   - The current real-world date is ${todayFormatted}.
   - The salon's active reporting period in the database is ${activeReportingPeriod}.
   - Do NOT start your responses with "Today is..." or announce the current date unless the user explicitly asks about the date, day, or time. Answer the user's specific question directly.
2. If asked about a client (e.g. Ben, Sarah), check atRiskCustomers. Give their overdue days, risk score, LTV, and a practical re-engagement step.
   If asked about no-shows or who missed appointments, check recentNoShowClients. Give their exact names (e.g. Benjamin Richardson, Elsie Campbell), dates, stylists, and lost value.
3. Suggest practical, revenue-saving steps (confirmation calls, card deposits for repeat offenders).
4. Maintain context across follow-up questions.
5. FORMATTING & PRESENTATION:
   - When comparing multiple clients, appointments, or staff metrics, format as a clean Markdown table with headers and pipe (|) rows.
   - When generating SMS or outreach messages, provide the ready-to-send draft directly with client name, service, and clear booking incentive.
   - Bold key numbers, client names, and metrics.
6. EXECUTIVE BREVITY & STRUCTURE:
   - Provide strategic, high-impact recommendations without unnecessary padding.
   - Do NOT duplicate content: if you detailed recommendations and SMS drafts in earlier sections, conclude with a crisp, punchy 2-3 step priority action list, rather than re-explaining everything.
7. MATHEMATICAL INTEGRITY:
   - Staff revenue is cumulative all-time; never divide all-time staff revenue by the current month revenue.
   - Only cite figures provided in the context; do not fabricate past weeks if not present.
8. ABSOLUTE COMPLETION:
   - Always finish every sentence, calculation, and section completely. Never stop mid-sentence, mid-list, or mid-table. Conclude cleanly.

--- LIVE SALON DATABASE CONTEXT ---
${contextStr}
--- END CONTEXT ---`;

    // Keep history compact (last 3 user queries, truncated) so prompt stays small and never causes token overflow
    const conversationMessages = history.slice(-3).map(h => ({
      role: h.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: h.text.length > 300 ? h.text.slice(0, 300) + '...' : h.text
    }));

    const callGroq = async (model: string, maxTokens: number = 3500) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationMessages,
              { role: 'user', content: query }
            ],
            temperature: 0.3,
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        return res;
      } catch (e) {
        clearTimeout(timeout);
        throw e;
      }
    };

    try {
      // 1. Primary: qwen/qwen3.8-27b (Fast, zero hidden reasoning tokens, crisp tables, no cutoffs, high token ceiling)
      let response = await callGroq('qwen/qwen3.8-27b', 3500);

      // 2. If rate-limited (429) or busy, failover to secondary models
      if (response.status === 429) {
        console.warn('[AI Advisor] Rate limited on qwen/qwen3.8-27b (429). Switching to backup model openai/gpt-oss-120b...');
        response = await callGroq('openai/gpt-oss-120b', 3500);
      }

      if (response.status === 429) {
        console.warn('[AI Advisor] Rate limited on openai/gpt-oss-120b (429). Switching to backup model openai/gpt-oss-20b...');
        response = await callGroq('openai/gpt-oss-20b', 2500);
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error('[AI Advisor] Groq error:', response.status, errText);
        return "I'm having trouble reaching the AI service right now. Please try again in a moment.";
      }

      const result = await response.json() as { choices: Array<{ message: { content: string }; finish_reason?: string }> };
      let answer = result.choices?.[0]?.message?.content?.trim();

      if (!answer) {
        return 'I received an empty response from the AI service. Please try rephrasing your question.';
      }

      // Safeguard: If output ever hits token length limits, gracefully trim dangling incomplete sentences or items
      if (result.choices?.[0]?.finish_reason === 'length') {
        console.warn('[AI Advisor] Response reached token length limit, applying graceful completion safeguard.');
        // Strip trailing incomplete numbered list item like "4\nImplement £20" or "4. Implement £20"
        answer = answer.replace(/\n+\d+\.?\s*[^.\n]*$/, '');
        // If not ending in punctuation, trim to the last valid punctuation mark
        if (!/[.!?]\s*$/.test(answer)) {
          const lastSentenceEnd = Math.max(answer.lastIndexOf('.'), answer.lastIndexOf('!'), answer.lastIndexOf('?'));
          if (lastSentenceEnd > answer.length * 0.7) {
            answer = answer.slice(0, lastSentenceEnd + 1);
          }
        }
      }

      return answer;

    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return 'The AI advisor timed out processing your request. Please try a shorter question.';
      }
      console.error('[AI Advisor] Unexpected error:', (err as Error)?.message ?? String(err));
      return 'Something went wrong with the AI advisor. Please try again shortly.';
    }
  }
};
