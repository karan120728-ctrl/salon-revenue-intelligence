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
    return { data: stylists };
  }

  if (endpoint === '/api/analytics/churn') {
    await delay(400);
    return { data: customers };
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
      if (query.includes('profit') || query.includes('make more') || query.includes('increase')) {
        answer = advisorResponses['how can i increase profits?'];
      } else if (query.includes('contact') || query.includes('who') || query.includes('call')) {
        answer = advisorResponses['who should i contact today?'];
      } else if (query.includes('lower') || query.includes('drop') || query.includes('down') || query.includes('revenue')) {
        answer = advisorResponses['why is revenue lower this month?'];
      } else if (query.includes('return') || query.includes('leave') || query.includes('lost') || query.includes('customer')) {
        answer = advisorResponses['which customers may never return?'];
      } else {
        answer = "As this is an interactive demo environment, I am currently showing static data. In your live salon account, I would instantly analyse your Timely/Fresha revenue history and give you a precise answer!";
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
