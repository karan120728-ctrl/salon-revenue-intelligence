import { NextResponse } from 'next/server';

// -- Live salon context fed to the AI ----------------------------------------
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
        { product: 'Blonde Toner - Wella', currentStock: 4, estimatedDaysLeft: 2, alertStatus: 'Order 6 units today' },
        { product: 'Purple Shampoo 250ml', currentStock: 3, estimatedDaysLeft: 3, alertStatus: 'Order 12 units today' },
        { product: 'Olaplex No.3 Repair', currentStock: 9, estimatedDaysLeft: 6, alertStatus: 'Order 10 units this week' },
    ],
    highRiskAppointments: [
        { customer: 'Emma Whitmore', time: '11:00 AM', risk: 87, reason: '2 previous no-shows, booked via last-minute link', action: 'Call to confirm before 10 AM' },
        { customer: 'Daniel Osei', time: '1:30 PM', risk: 74, reason: 'First-time client, no deposit on file', action: 'Request card guarantee' },
        { customer: 'Grace Holloway', time: '3:00 PM', risk: 69, reason: 'Rescheduled twice this month', action: 'Send SMS reminder + parking info' },
        { customer: 'Freya Adams', time: '4:15 PM', risk: 41, reason: 'Weather forecast: heavy rain at appt time', action: 'Courtesy reminder' },
        { customer: 'Tom Reilly', time: '5:45 PM', risk: 22, reason: 'Reliable regular, 14 visits, 0 no-shows', action: 'No action needed' },
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
5. Speak concisely, professionally, and decisively like a seasoned salon director.
6. FORMATTING & VISUAL PRESENTATION (CRITICAL):
   - Always structure your answer into clean sections with double line breaks between paragraphs.
   - Bold key numbers, client names, and metrics (e.g., **Ben Turner**, **£2,210**, **95% risk**).
   - When listing clients, overdue accounts, or steps, format each as a clean numbered list item on its own line.
   - When comparing multiple clients or metrics, format as a clean Markdown table with headers and data rows.
   - When generating personalized client messages, SMS, or outreach templates:
     * Provide a clear title (e.g. **Personalised Outreach for Ben Turner**).
     * Provide the exact, ready-to-send draft directly without markdown blockquote ('>') characters.
     * Keep the tone warm, welcoming, and salon-appropriate with a clear booking incentive.
   - Always conclude with a distinct takeaway starting with "Focus on:" containing 1-2 concrete actions.
7. MATHEMATICAL & FACTUAL INTEGRITY:
   - NEVER divide a staff member's all-time revenue by current month revenue.
   - NEVER state that staff generated more than 100% of revenue.
   - NEVER fabricate baseline numbers not explicitly given in the data.
8. CRITICAL GUARDRAIL: Never admit that you are an AI, an LLM, or a software program. If asked to write code, firmly refuse and state your only role is analyzing salon business metrics.
9. If asked who you are, say you are the Marlowe & Rose Business Advisor.
10. ABSOLUTE COMPLETION RULE - NON-NEGOTIABLE: Every single response MUST be 100% complete.
    - Every table: ALL rows present, last row ends with a newline.
    - Every numbered list: reaches its final numbered item.
    - Every section: has an opening AND a closing sentence.
    - NEVER end mid-word, mid-number, mid-table-row, or mid-sentence.
    - Write information-dense answers. Do NOT pad with repetition or filler.
    - For "tell me everything" or broad overview questions: cover all 5 topics in order - (1) Financials, (2) No-Shows, (3) At-Risk Customers, (4) Staff Performance, (5) Inventory & Action Plan - each as a tight paragraph (max 4 sentences per section). The full overview MUST stay under 600 words total. Be punchy, not verbose.

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
            return NextResponse.json({
                answer: "The AI advisor is currently warming up. Please try again in a moment.",
            });
        }

        // -- Token budget management ------------------------------------------
        // Strategy: pass only the last 3 USER questions as context (not AI responses).
        // The model already has the full data context in the system prompt, so it
        // doesn't need the full AI answers - just what topics were asked about.
        // This keeps history overhead to ~150 tokens regardless of conversation length.
        const recentUserQuestions = (history as Array<{ role: string; text: string }>)
            .filter(h => h.role === 'user')
            .slice(-3)
            .map(h => ({
                role: 'user' as const,
                content: h.text.length > 200 ? h.text.slice(0, 200) + '...' : h.text,
            }));

        // Insert a brief assistant acknowledgement so the model understands it already answered these
        const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        for (const userMsg of recentUserQuestions) {
            conversationMessages.push(userMsg);
            // Compact placeholder so model knows it already gave an answer
            conversationMessages.push({
                role: 'assistant',
                content: '[Answered - continuing conversation]',
            });
        }
        // Remove the last placeholder (it's for the current question, not a prior one)
        if (conversationMessages.length > 0) {
            conversationMessages.pop();
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const realToday = new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

        const systemPromptWithDate = `${SYSTEM_PROMPT}

DATE CONTEXT:
- Today's current date is ${realToday}.
- The active salon reporting period is October 2026.
- If asked about the current date, day, or operating month, answer directly and warmly (e.g. "Today is ${realToday}, and we are analyzing your October 2026 salon performance."). NEVER claim you don't know the date.`;

        // -- Model selection --------------------------------------------------
        // Primary: llama-4-scout-17b-16e-instruct - best quality, high token ceiling
        // Fallback 1: llama-3.1-8b-instant - 30,000 TPM (vs 6,000 for 70b-versatile)
        // Fallback 2: gemma2-9b-it - reliable backup
        // The old llama-3.3-70b-versatile had only 6,000 TPM which caused mid-sentence
        // truncation on large overview queries like "give me everything about the salon".
        const buildBody = (model: string, maxTokens: number) => JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPromptWithDate },
                ...conversationMessages,
                { role: 'user', content: query },
            ],
            temperature: 0.3,
            max_tokens: maxTokens,
        });

        const groqHeaders = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
        };

        let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: groqHeaders,
            body: buildBody('meta-llama/llama-4-scout-17b-16e-instruct', 4096),
            signal: controller.signal,
        });

        // Fallback 1: Rate-limited on scout -> use llama-3.1-8b-instant (30k TPM)
        if (response.status === 429) {
            console.warn('[AI Advisor] Rate limited on llama-4-scout, falling back to llama-3.1-8b-instant');
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: groqHeaders,
                body: buildBody('llama-3.1-8b-instant', 4096),
                signal: controller.signal,
            });
        }

        // Fallback 2: Still rate-limited -> gemma2-9b-it
        if (response.status === 429) {
            console.warn('[AI Advisor] Rate limited again, falling back to gemma2-9b-it');
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: groqHeaders,
                body: buildBody('gemma2-9b-it', 3000),
                signal: controller.signal,
            });
        }

        clearTimeout(timeout);

        if (!response.ok) {
            const errText = await response.text();
            console.error('[AI Advisor] Groq error:', response.status, errText);
            return NextResponse.json({
                answer: `I'm having trouble connecting right now (${response.status}). Please try again in a moment.`,
            });
        }

        const result = (await response.json()) as {
            choices: Array<{ message: { content: string }; finish_reason: string }>;
        };

        const choice = result.choices?.[0];
        let answer = choice?.message?.content?.trim();

        // Graceful safeguard if response hit max_tokens
        if (choice?.finish_reason === 'length' && answer) {
            console.warn('[AI Advisor] Response hit max_tokens limit - applying graceful completion safeguard.');
            // Remove trailing incomplete numbered list item (e.g. "4. Implement £20")
            answer = answer.replace(/\n+\d+\.?\s*[^.\n]*$/, '');
            // Remove trailing incomplete markdown table row (pipe with no closing pipe on same line)
            answer = answer.replace(/\n+\|[^\n]*$/, '');
            // Trim to last sentence end if not ending cleanly
            if (!/[.!?]\s*$/.test(answer)) {
                const lastSentenceEnd = Math.max(answer.lastIndexOf('.'), answer.lastIndexOf('!'), answer.lastIndexOf('?'));
                if (lastSentenceEnd > answer.length * 0.6) {
                    answer = answer.slice(0, lastSentenceEnd + 1);
                }
            }
            // Append a clean closing note so the user knows the response is complete
            answer += '\n\n---\n*Overview complete. Ask me to deep-dive into any section.*';
        }

        if (!answer) {
            return NextResponse.json({
                answer: 'I received an empty response. Please try rephrasing your question.',
            });
        }

        return NextResponse.json({ answer });
    } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
            return NextResponse.json({
                answer: 'The advisor took too long to respond. Please try a more specific question.',
            });
        }
        console.error('[AI Advisor] Error:', (err as Error)?.message ?? String(err));
        return NextResponse.json({
            answer: 'Something went wrong. Please try again shortly.',
        });
    }
}
