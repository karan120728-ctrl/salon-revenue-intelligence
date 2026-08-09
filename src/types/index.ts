export interface Stylist {
  name: string;
  role: string;
  revenue: number;
  appts: number;
  retail: number;
  rating: number;
  rebook: number;
  img: string;
  suggestion: string;
}

export interface Customer {
  name: string;
  last: string;
  expected: string;
  risk: number;
  ltv: number;
  action: string;
}

export interface NoShow {
  id: string;
  customer: string;
  time: string;
  risk: number;
  reason: string;
  action: string;
}

export interface Product {
  name: string;
  stock: number;
  days: number;
  supplier: string;
  reorder: string;
  ai: string;
}

export interface Notification {
  icon: string;
  tone: string;
  title: string;
  time: string;
  body: string;
}

export interface RevenueLeakItem {
  label: string;
  value: number;
  amt: number;
  color: string;
}

export interface WeeklyRevenueItem {
  d: string;
  actual: number;
  expected: number;
}

export interface Message {
  role: 'ai' | 'user';
  text: string;
}
