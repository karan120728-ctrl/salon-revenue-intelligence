import { NextResponse } from 'next/server';

// ── Demo salon context (same data the frontend shows) ───────────────────────
const DEMO_CONTEXT = {
    financials: {
        totalRevenue: '£2,840',
        noShowRate: '8%',
        appointmentsTotal: 46,
        appointmentsCompleted: 33,
        appointmentsNoShows: 4,
    },
    atRiskCustomers: [
        { name: 'Grace Holloway', lifetimeValue: '£1,840', daysOverdue: 35, riskScore: '92%', lastVisit: '11 weeks ago' },
        { name: 'Emma Whitmore', lifetimeValue: '£1,120', daysOverdue: 21, riskScore: '81%', lastVisit: '9 weeks ago' },
        { name: 'Aisha Patel', lifetimeValue: '£960', daysOverdue: 7, riskScore: '64%', lastVisit: '7 weeks ago' },
        { name: 'Ben Turner', lifetimeValue: '£2,210', daysOverdue: 56, riskScore: '95%', lastVisit: '14 weeks ago' },
        { name: 'Lily Foster', lifetimeValue: '£540', daysOverdue: 0, riskScore: '38%', lastVisit: '6 weeks ago' },
        { name: 'Noah Carter', lifetimeValue: '£1,360', daysOverdue: 28, riskScore: '77%', lastVisit: '10 weeks ago' },
        { name: 'Isla Wright', lifetimeValue: '£480', daysOverdue: 0, riskScore: '29%', lastVisit: '5 weeks ago' },
    ],
    staffPerformance: [
        { name: 'Chloe Bennett', role: 'Senior Colourist', rating: 4.9, rebookRate: '81%', generatedRevenue: '£5,420' },
        { name: 'Priya Anand', role: 'Creative Director', rating: 5.0, rebookRate: '88%', generatedRevenue: '£6,110' },
        { name: 'Jack Sullivan', role: 'Barber & Stylist', rating: 4.6, rebookRate: '58%', generatedRevenue: '£3,260' },
        { name: 'Olivia Hart', role: 'Stylist', rating: 4.7, rebookRate: '66%', generatedRevenue: '£2,980' },
        { name: 'Marcus Reid', role: 'Junior Stylist', rating: 4.4, rebookRate: '47%', generatedRevenue: '£1,840' },
    ],
    lowStockInventory: [
        { product: 'Blonde Toner — Wella', currentStock: 4, estimatedDaysLeft: 2, alertStatus: 'Order 6 units today' },
        { product: 'Purple Shampoo 250ml', currentStock: 3, estimatedDaysLeft: 3, alertStatus: 'Order 12 units today' },
        { product: 'Olaplex No.3 Repair', currentStock: 9, estimatedDaysLeft: 6, alertStatus: 'Order 10 units this week' },
    ],
};

const SYSTEM_PROMPT = `You are a top-tier executive Salon Business Consultant and Advisor for Sarah's independent hair & beauty salon.

CORE OBJECTIVE:
Provide direct, highly strategic, revenue-maximizing advice like a seasoned salon owner/operations director.

RULES:
1. Ground ALL facts directly in the supplied live database context below. Never invent metrics.
2. If asked about a client (e.g. Ben, Grace, Emma), check the atRiskCustomers list. State their exact overdue status, risk score, LTV, and immediately give a concrete, high-converting action.
3. Always suggest practical, revenue-saving steps (re-engagement scripts, cancellation deposit policies, staff commission incentives, inventory reorder reminders).
4. Maintain context across follow-up questions (e.g., if the user says "what should we do for him?", recognize they are referring to the client discussed previously).
5. Speak concisely, professionally, and decisively. Max 4 to 6 clear sentences per response.
6. CRITICAL GUARDRAIL: Never admit that you are an AI, an LLM, or a software program. If asked to write code, Python scripts, or build software, firmly refuse and state that your only role is analyzing salon business metrics and providing executive consulting.
7. If asked who you are, say you are the Marlowe & Rose Business Advisor.

--- LIVE SALON DATABASE CONTEXT ---
${JSON.stringify(DEMO_CONTEXT, null, 2)}
--- END CONTEXT ---`;

export async function POST(req: Request) {
    try {
        const { query, history = [] } = await req.json();

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ answer: 'Please ask a valid question.' }, { status: 400 });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            // Graceful fallback if key not set on Vercel
            return NextResponse.json({
                answer: "The AI advisor is currently warming up. Please try again in a moment.",
            });
        }

        // Map chat history to OpenAI/Groq format
        const conversationMessages = (history as Array<{ role: string; text: string }>)
            .slice(-6)
            .map((h) => ({
                role: h.role === 'user' ? ('user' as const) : ('assistant' as const),
                content: h.text,
            }));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify({
                model: 'groq/compound-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...conversationMessages,
                    { role: 'user', content: query },
                ],
                temperature: 0.3,
                max_tokens: 400,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errText = await response.text();
            console.error('[AI Advisor] Groq error:', response.status, errText);
            let safeErr = errText;
            try { safeErr = JSON.parse(errText).error.message; } catch (e) { }
            return NextResponse.json({
                answer: `Groq connection failed (${response.status}): ${safeErr}`,
            });
        }

        const result = (await response.json()) as {
            choices: Array<{ message: { content: string } }>;
        };
        const answer = result.choices?.[0]?.message?.content?.trim();

        if (!answer) {
            return NextResponse.json({
                answer: 'I received an empty response. Please try rephrasing your question.',
            });
        }

        return NextResponse.json({ answer });
    } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
            return NextResponse.json({
                answer: 'The advisor timed out. Please try a shorter or more specific question.',
            });
        }
        console.error('[AI Advisor] Error:', (err as Error)?.message ?? String(err));
        return NextResponse.json({
            answer: 'Something went wrong. Please try again shortly.',
        });
    }
}
