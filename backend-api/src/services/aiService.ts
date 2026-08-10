import { AnalyticsService } from './analyticsService';
import { prisma } from '../prisma';

// ── Context categories — determines which data we fetch per query ─────────────
type ContextCategory = 'revenue' | 'staff' | 'customers' | 'inventory' | 'appointments';

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
  async generateDailyBriefing(salonId: string, ownerName: string) {
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
          contextFacts.highRiskCancellations > 0 ? `Confirm your ${contextFacts.highRiskCancellations} risky appointments.` : 'No risky appointments today.',
          contextFacts.lowStockItemsCount > 0 ? `Restock ${contextFacts.lowStockItemsCount} items (including ${contextFacts.lowStockItemNames.split(',')[0]}).` : 'Inventory is healthy.',
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

      const result = await response.json();
      const contentText = result.choices[0].message.content;
      console.log('[AI] Groq raw content:', contentText);
      
      const parsed = JSON.parse(contentText);
      console.log('[AI] Parsed briefing:', JSON.stringify(parsed));
      return parsed;
      
    } catch (error: unknown) {
      console.error('[AI] Groq call failed:', (error as Error)?.message || error);
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

  // ── Dynamic AI Advisor ────────────────────────────────────────────────────────
  async askAdvisor(salonId: string, ownerName: string, query: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return "The AI advisor is currently offline — GROQ_API_KEY is not configured. Please contact your administrator.";
    }

    // 1. Determine which context categories are needed for this query
    const categories = determineContext(query);
    const contextParts: Record<string, unknown> = {};

    // 2. Fetch ONLY the relevant data — Backend is the source of truth
    const fetches: Promise<void>[] = [];

    if (categories.includes('revenue')) {
      fetches.push(
        AnalyticsService.getOverview(salonId).then(d => {
          contextParts.revenue = { total: d.revenue, noShowRate: d.noShowRate };
          contextParts.appointments = { total: d.appointments.total, completed: d.appointments.completed, noShows: d.appointments.noShows };
        })
      );
    }

    if (categories.includes('staff')) {
      fetches.push(
        AnalyticsService.getStaffPerformance(salonId).then(d => {
          contextParts.staff = d.map(s => ({
            name: s.name, role: s.role, rating: s.rating,
            rebookRate: `${s.rebookRate}%`, revenueGenerated: `£${s.generatedRevenue}`
          }));
        })
      );
    }

    if (categories.includes('customers')) {
      fetches.push(
        AnalyticsService.getChurnRisk(salonId).then(d => {
          contextParts.churnRisk = {
            highRiskCount: d.length,
            topAtRisk: d.slice(0, 5).map(c => ({
              name: c.name, ltv: `£${c.ltv}`, daysOverdue: c.daysOverdue, riskScore: `${c.risk}%`
            }))
          };
        })
      );
    }

    if (categories.includes('inventory')) {
      fetches.push(
        prisma.inventory.findMany({
          where: { salonId },
          include: { product: true },
          orderBy: { daysLeft: 'asc' }
        }).then(inv => {
          contextParts.inventory = inv.map(i => ({
            product: i.product.name, stock: i.stock, daysLeft: i.daysLeft, alert: i.reorderAlert
          }));
        })
      );
    }

    // Fetch appointments context if asked and not already populated by revenue fetch
    if (categories.includes('appointments') && !categories.includes('revenue')) {
      fetches.push(
        AnalyticsService.getOverview(salonId).then(d => {
          contextParts.appointments = { total: d.appointments.total, completed: d.appointments.completed, noShows: d.appointments.noShows };
        })
      );
    }

    await Promise.all(fetches);

    // 3. Build structured context string for the prompt
    const contextStr = JSON.stringify(contextParts, null, 2);

    const systemPrompt = `${SYSTEM_PROMPT_BASE}

--- SALON BUSINESS CONTEXT (verified from live database) ---
Salon owner name: ${ownerName}
${contextStr}
--- END OF CONTEXT ---`;

    // 4. Call Groq — timeout after 15s
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
            { role: 'user', content: query }
          ],
          temperature: 0.3,
          max_tokens: 300
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        console.error('[AI Advisor] Groq error:', response.status, errText);
        return "I'm having trouble reaching the AI service right now. Please try again in a moment.";
      }

      const result = await response.json();
      const answer = result.choices?.[0]?.message?.content?.trim();

      if (!answer) {
        return "I received an empty response from the AI service. Please try rephrasing your question.";
      }

      return answer;

    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return "The AI advisor timed out processing your request. Please try a shorter or more specific question.";
      }
      console.error('[AI Advisor] Unexpected error:', (err as Error)?.message || err);
      return "Something went wrong with the AI advisor. Please try again shortly.";
    }
  }
};
