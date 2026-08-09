import { AnalyticsService } from './analyticsService';
import { prisma } from '../prisma';

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

    // 4. Call Groq (Llama 3.1 70B) - Generous Free Tier & Highly Intelligent
    try {
      const prompt = `You are a high-end, ruthless, and incredibly sharp Salon Business Consultant. 
      You are giving a brutally honest, 3-bullet daily briefing to a salon owner named ${ownerName}.
      
      You do not talk like a typical AI. You talk like an elite industry veteran who cares about making money and retaining clients. Do not mention "graphs" or "numbers" directly like a robot. Speak strategically.
      
      Today's Reality:
      - We made £${contextFacts.revenue}.
      - We have ${contextFacts.appointmentsToday} appointments today.
      - ${contextFacts.highRiskCancellations} clients are high-risk for no-showing today.
      - ${contextFacts.lowStockItemsCount} retail products are running out (${contextFacts.lowStockItemNames}).
      
      Return a JSON object with strictly this format:
      {
        "greeting": "A sharp, confident morning greeting (e.g., 'Morning Sarah. Time to protect today's revenue.')",
        "recommendations": ["Actionable, consultant-level tip 1", "Actionable, consultant-level tip 2", "Actionable, consultant-level tip 3"]
      }`;

      console.log('[AI] Calling Groq with model: llama-3.3-70b-versatile');
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: 'Generate the JSON briefing now.' }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 512
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
      
    } catch (error: any) {
      console.error('[AI] Groq call failed:', error?.message || error);
      return {
        greeting: `Good morning, ${ownerName}. (Offline Mode)`,
        recommendations: [
          'Please verify your GROQ_API_KEY.',
          'Check upcoming appointments for no-show risk.',
          'Review inventory levels manually.'
        ]
      };
    }
  }
};
