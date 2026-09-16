import { revenueLeakData, noshows, weeklyRevenue, notifications, advisorResponses } from '@/data/mock';

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

  if (endpoint === '/api/inventory') {
    await delay(300);
    return { data: { lowStockCount: 3 } };
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
