import { stylists, customers, products, revenueLeakData, noshows, weeklyRevenue, notifications, advisorResponses } from '@/data/mock';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper to simulate network latency for the demo
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  // ==========================================
  // 🚀 STANDALONE DEMO MODE INTERCEPT
  // These routes return hardcoded static data so the Vercel frontend works 
  // perfectly for prospects without needing the Render backend.
  // ==========================================

  if (endpoint === '/health') {
    await delay(200);
    return { ok: true };
  }

  if (endpoint === '/auth/login') {
    await delay(1000); // Simulate sign-in delay
    return { token: 'demo-token', user: { name: 'Sarah', role: 'OWNER' } };
  }

  if (endpoint === '/api/analytics/overview') {
    await delay(600);
    return {
      data: {
        revenue: 2840,
        noShowRate: 8,
        appointments: { total: 46, completed: 33, noShows: 4 },
      }
    };
  }

  if (endpoint === '/api/analytics/briefing') {
    await delay(800);
    return {
      data: {
        greeting: "Good morning, Sarah.",
        recommendations: [
          "Call Emma before 11 AM to confirm",
          "Offer a Thursday promotion based on low bookings",
          "Reorder Blonde Toner for Chloe's upcoming services"
        ]
      }
    };
  }

  if (endpoint === '/api/analytics/staff') {
    await delay(300);
    // Transform mock stylists to match the schema Staff.tsx expects
    return {
      data: stylists.map(s => ({
        name: s.name,
        role: s.role,
        generatedRevenue: s.revenue,
        rebookRate: s.rebook,
        rating: s.rating,
      }))
    };
  }

  if (endpoint === '/api/analytics/churn') {
    await delay(400);
    // Transform mock customers to match the schema Retention.tsx expects
    const now = Date.now();
    return {
      data: customers.map(c => {
        // Parse "11 weeks ago" => daysOverdue
        const weeksMatch = c.last.match(/(\d+)\s*weeks?\s*ago/i);
        const weeksAgo = weeksMatch ? parseInt(weeksMatch[1]) : 6;
        const daysOverdue = Math.max(0, (weeksAgo - 6) * 7); // assume 6-week cycle
        return {
          name: c.name,
          lastVisit: new Date(now - weeksAgo * 7 * 86400000).toISOString(),
          expectedVisit: daysOverdue > 0
            ? new Date(now - daysOverdue * 86400000).toISOString()
            : new Date(now + 7 * 86400000).toISOString(),
          risk: c.risk,
          ltv: c.ltv,
          daysOverdue,
        };
      })
    };
  }

  if (endpoint === '/api/appointments') {
    await delay(350);
    return { data: noshows };
  }

  if (endpoint === '/api/inventory') {
    await delay(300);
    return { data: { items: products, lowStockCount: 3 } };
  }

  if (endpoint === '/api/ai/advisor') {
    await delay(1200);
    const body = options.body ? JSON.parse(options.body as string) : {};
    const query = (body.query || '').toLowerCase().trim();

    let answer = advisorResponses[query];

    if (!answer) {
      if (query.includes('profit') || query.includes('make more') || query.includes('increase') || query.includes('grow') || query.includes('more money')) {
        answer = advisorResponses['how can i increase profits?'];
      } else if (query.includes('contact') || query.includes('call') || query.includes('reach out') || query.includes('message')) {
        answer = advisorResponses['who should i contact today?'];
      } else if (query.includes('lower') || query.includes('drop') || query.includes('down') || query.includes('revenue') || query.includes('less') || query.includes('decline')) {
        answer = advisorResponses['why is revenue lower this month?'];
      } else if (query.includes('return') || query.includes('leave') || query.includes('lost') || query.includes('churn') || query.includes('never come back')) {
        answer = advisorResponses['which customers may never return?'];
      } else if (query.includes('who') || query.includes('customer') || query.includes('client')) {
        answer = advisorResponses['who should i contact today?'];
      } else if (query.includes('generate') || query.includes('create') || query.includes('write') || query.includes('draft') || query.includes('send')) {
        answer = "Absolutely — in your live salon account, I'd generate a personalised win-back message for each at-risk client using their booking history, preferred services, and visit patterns. For this interactive demo, head to the Customer Retention page and click 'Generate message' next to any customer to see a sample.";
      } else if (query.includes('you') || query.includes('your name') || query.includes('who are') || query.includes('what are')) {
        answer = "I'm the Marlowe & Rose AI Business Advisor — an intelligent layer trained on your salon's live revenue, staffing, inventory, and client data. I analyse patterns across your bookings to surface actionable insights every morning. Think of me as your silent business partner who never sleeps and never misses a number.";
      } else if (query.includes('owner') || query.includes('salon') || query.includes('name')) {
        answer = "This demo salon is run by Sarah, a fictional owner we created to showcase how Marlowe & Rose works. In your live account, I'd know your real name, your team, your top clients, and every revenue pattern in your business.";
      } else if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('good')) {
        answer = "Good morning! I'm ready to help. You can ask me about revenue trends, which clients to contact today, staff performance, or inventory levels — anything about running your salon more profitably.";
      } else {
        answer = "Great question. In your live salon account, I'd pull from your real Timely or Fresha data to give you a precise, grounded answer. This interactive demo uses sample data — but the experience you see here is exactly what you'd get every morning with your own numbers.";
      }
    }

    return { answer };
  }

  // ==========================================
  // REAL BACKEND CALL (Runs if it's not a mocked route)
  // ==========================================

  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('salon_token') || '';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('salon_token');
      window.location.href = '/login';
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'API request failed');
  }

  return res.json();
}
