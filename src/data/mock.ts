import type {
  Stylist,
  Customer,
  NoShow,
  Product,
  Notification,
  RevenueLeakItem,
  WeeklyRevenueItem,
} from '@/types';

export const stylists: Stylist[] = [
  {
    name: 'Chloe Bennett',
    role: 'Senior Colourist',
    revenue: 5420,
    appts: 38,
    retail: 640,
    rating: 4.9,
    rebook: 81,
    img: 'CB',
    suggestion: "Booking 96% full through Friday — open a late slot Thursday.",
  },
  {
    name: 'Priya Anand',
    role: 'Creative Director',
    revenue: 6110,
    appts: 33,
    retail: 820,
    rating: 5.0,
    rebook: 88,
    img: 'PA',
    suggestion: "Highest rebooking rate on the floor — feature her in this week's promo.",
  },
  {
    name: 'Jack Sullivan',
    role: 'Barber & Stylist',
    revenue: 3260,
    appts: 41,
    retail: 210,
    rating: 4.6,
    rebook: 58,
    img: 'JS',
    suggestion: "Retail attach rate is 3x below team average — prompt product add-ons at checkout.",
  },
  {
    name: 'Olivia Hart',
    role: 'Stylist',
    revenue: 2980,
    appts: 29,
    retail: 410,
    rating: 4.7,
    rebook: 66,
    img: 'OH',
    suggestion: "Wednesdays run 40% empty — worth a loyalty offer to fill the chair.",
  },
  {
    name: 'Marcus Reid',
    role: 'Junior Stylist',
    revenue: 1840,
    appts: 25,
    retail: 180,
    rating: 4.4,
    rebook: 47,
    img: 'MR',
    suggestion: "Rebooking is trailing the team — pair with Priya for a shadow shift.",
  },
];

export const customers: Customer[] = [
  { name: 'Grace Holloway', last: '11 weeks ago', expected: 'Overdue by 5 wks', risk: 92, ltv: 1840, action: 'Call — VIP colour client going cold' },
  { name: 'Emma Whitmore', last: '9 weeks ago', expected: 'Overdue by 3 wks', risk: 81, ltv: 1120, action: 'Send win-back offer' },
  { name: 'Aisha Patel', last: '7 weeks ago', expected: 'Due this week', risk: 64, ltv: 960, action: 'Text reminder — usual 6wk cycle' },
  { name: 'Ben Turner', last: '14 weeks ago', expected: 'Overdue by 8 wks', risk: 95, ltv: 2210, action: 'Personal call from Priya' },
  { name: 'Lily Foster', last: '6 weeks ago', expected: 'Due in 2 days', risk: 38, ltv: 540, action: 'Auto rebook SMS' },
  { name: 'Noah Carter', last: '10 weeks ago', expected: 'Overdue by 4 wks', risk: 77, ltv: 1360, action: 'Send win-back offer' },
  { name: 'Isla Wright', last: '5 weeks ago', expected: 'Due in 5 days', risk: 29, ltv: 480, action: 'No action needed' },
];

export const noshows: NoShow[] = [
  { id: '#A-2841', customer: 'Emma Whitmore', time: '11:00 AM', risk: 87, reason: '2 previous no-shows, booked via last-minute link', action: 'Call to confirm before 10 AM' },
  { id: '#A-2846', customer: 'Daniel Osei', time: '1:30 PM', risk: 74, reason: 'First-time client, no deposit on file', action: 'Request card guarantee' },
  { id: '#A-2852', customer: 'Grace Holloway', time: '3:00 PM', risk: 69, reason: 'Rescheduled twice this month', action: 'Send SMS reminder + parking info' },
  { id: '#A-2860', customer: 'Freya Adams', time: '4:15 PM', risk: 41, reason: 'Weather forecast: heavy rain at appt time', action: 'Courtesy reminder' },
  { id: '#A-2863', customer: 'Tom Reilly', time: '5:45 PM', risk: 22, reason: 'Reliable regular, 14 visits, 0 no-shows', action: 'No action needed' },
];

export const products: Product[] = [
  { name: 'Blonde Toner — Wella', stock: 4, days: 2, supplier: 'Wella Professionals', reorder: 'Order 6 units today', ai: "Chloe's colour bookings will exhaust stock by Thursday." },
  { name: 'Olaplex No.3 Repair', stock: 9, days: 6, supplier: 'Olaplex UK', reorder: 'Order 10 units this week', ai: 'Retail demand up 22% this month.' },
  { name: 'Bond Repair Mask', stock: 14, days: 11, supplier: 'K18', reorder: 'Monitor', ai: 'Healthy — no action needed.' },
  { name: 'Purple Shampoo 250ml', stock: 3, days: 3, supplier: 'Fanola', reorder: 'Order 12 units today', ai: 'Best-selling retail SKU — stockout risk this weekend.' },
  { name: 'Argan Shine Serum', stock: 18, days: 19, supplier: 'Moroccanoil', reorder: 'Monitor', ai: 'Healthy — no action needed.' },
  { name: 'Matte Finish Hairspray', stock: 6, days: 5, supplier: "L'Oréal Pro", reorder: 'Order 8 units this week', ai: 'Low, but non-urgent — bundle with next Wella order.' },
];

export const notifications: Notification[] = [
  { icon: 'alert', tone: 'high', title: 'Emma Whitmore may cancel today', time: '8 min ago', body: '87% no-show risk for her 11:00 AM colour appointment.' },
  { icon: 'droplet', tone: 'med', title: 'Blonde Toner running low', time: '41 min ago', body: "4 units left — Chloe's bookings will exhaust stock by Thursday." },
  { icon: 'users', tone: 'med', title: "Grace Holloway hasn't visited in 11 weeks", time: '2 hr ago', body: 'Highest-value client currently going cold. Suggested: personal call.' },
  { icon: 'trenddown', tone: 'low', title: 'Retail sales dropped 18% this week', time: '3 hr ago', body: "Mainly driven by lower add-on sales during Jack's appointments." },
  { icon: 'check', tone: 'good', title: 'Thursday promotion sent', time: 'Yesterday', body: '128 clients reached, 19 rebookings so far.' },
];

export const revenueLeakData: RevenueLeakItem[] = [
  { label: 'No-shows', value: 32, amt: 1120, color: '#C4485A' },
  { label: 'Late arrivals', value: 18, amt: 630, color: '#D98094' },
  { label: 'Low retail attach', value: 22, amt: 770, color: '#C99A45' },
  { label: 'Empty chairs', value: 16, amt: 560, color: '#8C93A6' },
  { label: 'Inactive customers', value: 12, amt: 420, color: '#3E4257' },
];

export const weeklyRevenue: WeeklyRevenueItem[] = [
  { d: 'Mon', actual: 2760, expected: 3100 },
  { d: 'Tue', actual: 2410, expected: 2950 },
  { d: 'Wed', actual: 2980, expected: 3200 },
  { d: 'Thu', actual: 3340, expected: 3400 },
  { d: 'Fri', actual: 3890, expected: 3950 },
  { d: 'Sat', actual: 4620, expected: 4700 },
  { d: 'Sun', actual: 1980, expected: 2400 },
];

export const advisorResponses: Record<string, string> = {
  'why is revenue lower this month?':
    'Revenue is down 6% vs last month, mainly from two sources: a 22% drop in retail attach rate (concentrated in Jack and Marcus\'s appointments) and 3 additional no-shows per week compared to your monthly average. Colour and cut revenue itself is flat — this is a checkout and attendance issue, not a demand issue.',
  'who should i contact today?':
    "Three people: Emma Whitmore (87% no-show risk for her 11:00 AM), Grace Holloway (your highest-LTV client, now 11 weeks overdue), and Ben Turner (14 weeks overdue, £2,210 lifetime value). I'd start with Grace — a short personal call tends to outperform an SMS at this risk level.",
  'which customers may never return?':
    '7 customers are currently flagged, led by Ben Turner and Grace Holloway. Combined, they represent roughly £8,510 in lifetime value. I can generate personalised win-back messages for any of them from the Customer Retention page.',
  'how can i increase profits?':
    'The fastest lever right now is retail attach — lifting Jack and Marcus to the team average would add roughly £380/week with no extra bookings needed. After that, filling Wednesday afternoons and tightening the no-show policy for first-time bookings are your next two highest-impact actions.',
};
