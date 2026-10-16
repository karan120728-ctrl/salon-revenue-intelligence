import { stylists, customers, products, revenueLeakData, noshows, weeklyRevenue, notifications, advisorResponses } from '@/data/mock';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper to simulate network latency for the demo
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('salon_token') || '';
  }

  const isDemoUser = token === 'demo-token';
  const forceDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // If we have a real backend token and demo mode is not forced, hit the real backend first
  if (token && !isDemoUser && !forceDemo) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('salon_token');
          window.location.href = '/login';
        }
      }

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`[API] Live backend call to ${endpoint} failed, checking demo fallback...`, err);
    }
  }

  // ==========================================
  // 🚀 STANDALONE DEMO MODE INTERCEPT / FALLBACK
  // ==========================================

  if (endpoint === '/health') {
    try {
      const r = await fetch(`${API_BASE}/health`);
      if (r.ok) return await r.json();
    } catch (_) {}
    await delay(200);
    return { ok: true };
  }

  if (endpoint === '/auth/login') {
    // Attempt real backend authentication first unless forced demo
    if (!forceDemo) {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
        if (res.ok) {
          return await res.json();
        }
        if (res.status === 400 || res.status === 401) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Invalid email or password');
        }
      } catch (err: any) {
        if (err.message && err.message !== 'Failed to fetch') {
          throw err;
        }
        console.warn('[API] Backend login failed, falling back to demo login:', err);
      }
    }
    await delay(1000); // Simulate sign-in delay
    return { token: 'demo-token', user: { name: 'Sarah', role: 'OWNER' } };
  }

  if (endpoint === '/api/analytics/overview') {
    await delay(600);
    return {
      data: {
        revenue: 2840,
        noShowRate: 8,
        utilisationRate: 72,
        revenueDeltaPct: 12,
        appointments: { total: 46, completed: 33, noShows: 4, cancelled: 3 },
      }
    };
  }

  if (endpoint === '/api/analytics/monthly') {
    await delay(400);
    return {
      data: {
        bookingsThisMonth: 46,
        noShowRate: 8.7,
        noShowRateDelta: -1.1,
        newCustomers: 6,
        newCustomersDelta: null,
        retailSales: null,
        monthlyRevenueChart: {
          labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
          values: [0, 0, 0, 0, 0, 2840],
        },
      }
    };
  }

  if (endpoint === '/api/analytics/noshow-prediction') {
    await delay(300);
    return { data: { appointments: [], highRiskCount: 0, avgRisk: 0, revenueAtRisk: 0 } };
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

  if (endpoint === '/api/analytics/leak') {
    await delay(350);
    return {
      data: {
        totalLostWeekly: 3500,
        totalLostMonthly: 15155,
        largestCausePercent: 32,
        largestCauseLabel: 'No-shows',
        recoverableMonthly: 2100,
        breakdown: revenueLeakData,
        recommendations: [
          { t: 'Tighten no-show policy', d: 'Require card guarantees for first-time bookings — could recover ~£1,120/wk.', tag: 'No-shows' },
          { t: 'Add checkout prompts for stylists', d: 'Jack and Marcus have the lowest retail attach — a simple prompt script could lift sales 15%.', tag: 'Retail' },
          { t: 'Fill Wednesday afternoons', d: 'Consistently 40% empty — a loyalty flash offer could convert 6–8 extra bookings a week.', tag: 'Empty chairs' },
          { t: 'Automate late-arrival buffers', d: 'Adding a 10-minute buffer to peak slots reduces knock-on delays without cutting capacity.', tag: 'Late arrivals' },
        ],
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
    // Transform mock noshows to match the Prisma schema NoShow.tsx expects
    const now = new Date();
    return {
      data: noshows.map((n, i) => {
        // Parse time like "11:00 AM" into a real date object
        const [time, modifier] = n.time.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        const aptDate = new Date(now);
        aptDate.setHours(hours, minutes, 0, 0);

        return {
          id: `APT-${1000 + i}`,
          status: 'SCHEDULED',
          date: aptDate.toISOString(),
          risk: Object.assign({}, n).risk,
          riskReason: Object.assign({}, n).reason,
          customer: { name: (n as any).client || Object.assign({}, n).customer },
          services: [{ priceAtBooking: (n as any).revenue || 0 }]
        };
      })
    };
  }

  if (endpoint === '/api/inventory') {
    await delay(300);
    return { data: { items: products, lowStockCount: 3 } };
  }

  if (endpoint === '/api/ai/advisor') {
    // Route to the Next.js server-side API route (calls Groq with live context)
    // This does NOT hit the Render backend — it stays entirely on Vercel.
    try {
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: options.body,
      });
      // Always parse — route.ts returns {answer:...} with status 200 even on errors
      const data = await res.json();
      if (data?.answer) return data;
    } catch (err) {
      console.error('[AI Advisor] fetch failed:', err);
    }
    return { answer: "I'm having trouble reaching the AI service right now. Please try again in a moment." };
  }

  // ==========================================
  // REAL BACKEND CALL (Runs if it's not a mocked route)
  // ==========================================

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
