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

    // 4. Call Groq — use 8B Instant for fast briefings (~0.5s vs 3s for 70B)
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
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: 'Generate now.' }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4,
          max_tokens: 200
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

    // Fetch complete live salon data to guarantee zero missing context (Customer Churn, Revenue, Staff, Inventory)
    const [overview, staffPerf, churnRisk, inventoryData] = await Promise.all([
      AnalyticsService.getOverview(salonId),
      AnalyticsService.getStaffPerformance(salonId),
      AnalyticsService.getChurnRisk(salonId),
      prisma.inventory.findMany({
        where: { salonId },
        include: { product: true },
        orderBy: { daysLeft: 'asc' }
      })
    ]);

    const contextParts = {
      financials: {
        totalRevenue: `£${overview.revenue}`,
        noShowRate: `${overview.noShowRate}%`,
        appointmentsTotal: overview.appointments.total,
        appointmentsCompleted: overview.appointments.completed,
        appointmentsNoShows: overview.appointments.noShows
      },
      atRiskCustomers: churnRisk.map(c => ({
        name: c.name,
        email: c.email || 'N/A',
        phone: c.phone || 'N/A',
        lifetimeValue: `£${c.ltv}`,
        daysOverdue: c.daysOverdue,
        riskScore: `${c.risk}%`,
        lastVisit: c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('en-GB') : 'Unknown'
      })),
      staffPerformance: staffPerf.map(s => ({
        name: s.name,
        role: s.role,
        rating: s.rating,
        rebookRate: `${s.rebookRate}%`,
        generatedRevenue: `£${s.generatedRevenue}`
      })),
      lowStockInventory: inventoryData.map(i => ({
        product: i.product.name,
        currentStock: i.stock,
        estimatedDaysLeft: i.daysLeft,
        alertStatus: i.reorderAlert || 'Healthy'
      }))
    };

    const contextStr = JSON.stringify(contextParts, null, 2);

    const systemPrompt = `You are a top-tier executive Salon Business Consultant and Advisor for ${ownerName}'s independent hair & beauty salon.

CORE OBJECTIVE:
Provide direct, highly strategic, revenue-maximizing advice like a seasoned salon owner/operations director.

RULES:
1. Ground ALL facts directly in the supplied live database context below. Never invent metrics.
2. If asked about a client (e.g. Ben, Sarah), check the atRiskCustomers list. State their exact overdue status, risk score, LTV, and immediately give a concrete, high-converting action (e.g. "Send SMS with a 15% discount on their usual treatment").
3. Always suggest practical, revenue-saving steps (re-engagement scripts, cancellation deposit policies, staff commission incentives, inventory reorder reminders).
4. Maintain context across follow-up questions (e.g., if the user says "what should we do for him?", recognize they are referring to the client discussed previously).
5. Speak concisely, professionally, and decisively. Max 4 to 6 clear sentences per response.

--- LIVE SALON DATABASE CONTEXT ---
${contextStr}
--- END CONTEXT ---`;

    // Map chat history into OpenAI/Groq messages format
    const conversationMessages = history.slice(-6).map(h => ({
      role: h.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: h.text
    }));

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationMessages,
            { role: 'user', content: query }
          ],
          temperature: 0.3,
          max_tokens: 400
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        console.error('[AI Advisor] Groq error:', response.status, errText);
        return "I'm having trouble reaching the AI service right now. Please try again in a moment.";
      }

      const result = await response.json() as { choices: Array<{ message: { content: string } }> };
      const answer = result.choices?.[0]?.message?.content?.trim();

      if (!answer) {
        return 'I received an empty response from the AI service. Please try rephrasing your question.';
      }

      return answer;

    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return 'The AI advisor timed out processing your request. Please try a shorter or more specific question.';
      }
      console.error('[AI Advisor] Unexpected error:', (err as Error)?.message ?? String(err));
      return 'Something went wrong with the AI advisor. Please try again shortly.';
    }
  }
};
