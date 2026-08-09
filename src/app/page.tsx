'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import FaqItem from '@/components/shared/FaqItem';
import { revenueLeakData } from '@/data/mock';
import { money } from '@/lib/utils';

export default function Landing() {
  const router = useRouter();

  return (
    <div className="bg-[var(--porcelain)]">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[var(--ink)] flex items-center justify-center">
            <Icon name="scissors" size={14} className="text-white" />
          </div>
          <span className="font-display text-lg tracking-tight">
            Marlowe &amp; Rose <span className="text-[var(--slate)] font-sans text-xs align-middle font-medium ml-1">Revenue Intelligence</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--slate)]">
          <a href="#how" className="hover:text-[var(--ink)]">How it works</a>
          <a href="#features" className="hover:text-[var(--ink)]">Features</a>
          <a href="#pricing" className="hover:text-[var(--ink)]">Pricing</a>
          <a href="#faq" className="hover:text-[var(--ink)]">FAQ</a>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/login')} className="text-sm font-semibold hidden sm:block">
            Sign in
          </button>
          <button onClick={() => router.push('/login')} className="btn-primary text-sm !py-2.5 !px-5">
            Book demo
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-7xl mx-auto px-6 pt-10 pb-24 grid lg:grid-cols-2 gap-14 items-center">
        <div className="fade-up">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--rosewood-deep)] bg-[#FBE7E9] px-3 py-1.5 rounded-full mb-6">
            <Icon name="sparkle" size={13} /> AI Operations, not another dashboard
          </div>
          <h1 className="font-display text-[2.6rem] sm:text-6xl leading-[1.05] tracking-tight">
            Stop losing revenue. Let AI run your salon operations.
          </h1>
          <p className="text-lg text-[var(--slate)] mt-6 leading-relaxed max-w-lg">
            Discover hidden revenue leaks, predict no-shows, bring customers back, optimise staff schedules and grow profits — before your first client sits down.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-9">
            <button onClick={() => router.push('/login')} className="btn-primary">
              Book demo <Icon name="chevron" size={15} />
            </button>
            <button onClick={() => router.push('/app')} className="btn-secondary flex items-center gap-2">
              <Icon name="play" size={14} /> View interactive demo
            </button>
          </div>
          <div className="flex items-center gap-6 mt-10 text-xs text-[var(--slate)] font-medium">
            <span>Trusted by independent salons across</span>
            <span className="font-display text-sm text-[var(--ink)]">London</span>
            <span className="font-display text-sm text-[var(--ink)]">Manchester</span>
            <span className="font-display text-sm text-[var(--ink)]">Austin</span>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="relative fade-up" style={{ animationDelay: '150ms' }}>
          <div className="absolute -inset-6 bg-gradient-to-br from-[#F1DEE1] via-transparent to-[#DCEAE3] rounded-[2rem] blur-2xl opacity-70" />
          <div className="relative card p-6 rounded-[1.75rem] shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--slate)]">AI Daily Briefing</p>
                <p className="font-display text-xl mt-1">Good morning, Sarah.</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[var(--ink)] flex items-center justify-center">
                <Icon name="sparkle" size={15} className="text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[var(--paper)] rounded-xl p-3.5">
                <p className="text-[11px] uppercase text-[var(--slate)] font-semibold">Forecast revenue</p>
                <p className="font-mono text-2xl mt-1">£2,840</p>
              </div>
              <div className="bg-[var(--paper)] rounded-xl p-3.5">
                <p className="text-[11px] uppercase text-[var(--slate)] font-semibold">Appointments</p>
                <p className="font-mono text-2xl mt-1">46</p>
              </div>
              <div className="bg-[#FBE7E9] rounded-xl p-3.5">
                <p className="text-[11px] uppercase text-[var(--rosewood-deep)] font-semibold">High-risk cancellations</p>
                <p className="font-mono text-2xl mt-1 text-[var(--rosewood-deep)]">4</p>
              </div>
              <div className="bg-[#FCF1E1] rounded-xl p-3.5">
                <p className="text-[11px] uppercase text-[#96712A] font-semibold">Low stock</p>
                <p className="font-mono text-2xl mt-1 text-[#96712A]">3</p>
              </div>
            </div>
            <div className="stitch mb-4" />
            <p className="text-xs font-semibold uppercase text-[var(--slate)] mb-2">Recommended today</p>
            <ul className="space-y-2 text-sm">
              {['Contact Emma before 11 AM', 'Offer Thursday promotion', 'Reorder Blonde Toner'].map((t, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[var(--sage-soft)] flex items-center justify-center flex-shrink-0">
                    <Icon name="check" size={11} className="text-[var(--sage)]" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-20 border-t border-[var(--line)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--rosewood-deep)] mb-3">How it works</p>
        <h2 className="font-display text-4xl max-w-xl mb-14">Your business, read by AI every morning.</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              t: 'Connect your booking data',
              d: 'Marlowe & Rose links to your existing calendar, POS and retail sales — no new booking system to learn.',
              i: 'grid',
            },
            {
              t: 'AI finds the leaks',
              d: 'Every appointment, customer and product is scored continuously for revenue risk, not just reported after the fact.',
              i: 'droplet',
            },
            {
              t: "You get today's actions",
              d: 'A short, specific list each morning — who to call, what to restock, which chair to fill.',
              i: 'sparkle',
            },
          ].map((s, i) => (
            <div key={i} className="fade-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="w-11 h-11 rounded-full bg-[var(--ink)] flex items-center justify-center mb-5">
                <Icon name={s.i} size={19} className="text-white" />
              </div>
              <h3 className="font-display text-xl mb-2">{s.t}</h3>
              <p className="text-[var(--slate)] text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[var(--ink)] text-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#D98094] mb-3">Features</p>
          <h2 className="font-display text-4xl max-w-xl mb-14">Built to find money, not just show numbers.</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                t: 'Revenue leak analysis',
                d: 'See exactly where margin disappears — no-shows, empty chairs, weak retail attach.',
                i: 'trenddown',
              },
              {
                t: 'No-show prediction',
                d: 'Every booking scored for cancellation risk, with a specific recommended action.',
                i: 'alert',
              },
              {
                t: 'Customer retention',
                d: "Know who's going cold before they've decided to leave, with a message ready to send.",
                i: 'users',
              },
              {
                t: 'Staff performance',
                d: 'Rebooking, retail and utilisation per stylist, with coaching suggestions attached.',
                i: 'star',
              },
              {
                t: 'Inventory intelligence',
                d: 'Stock levels tied to actual booking demand, not guesswork reorder points.',
                i: 'box',
              },
              {
                t: 'AI business advisor',
                d: 'Ask it anything about your salon in plain English and get a grounded answer.',
                i: 'chat',
              },
              {
                t: 'Live notifications',
                d: 'The moments that matter, surfaced the instant they happen — nothing buried in a report.',
                i: 'bell',
              },
              {
                t: 'Executive analytics',
                d: 'Weekly and monthly trend lines built for a five-second read before opening the doors.',
                i: 'chart',
              },
            ].map((f, i) => (
              <div key={i} className="card-hover border border-white/10 rounded-2xl p-6 fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <Icon name={f.i} size={20} className="text-[#D98094] mb-4" />
                <h3 className="font-display text-lg mb-2">{f.t}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leaks section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--rosewood-deep)] mb-3">AI insights</p>
            <h2 className="font-display text-4xl mb-6">Every leak has a drip. We show you where they land.</h2>
            <p className="text-[var(--slate)] leading-relaxed mb-8">
              Revenue doesn&apos;t disappear all at once — it drips away, appointment by appointment. Marlowe &amp; Rose traces every drip back to a cause and a fix, so nothing gets written off as &quot;a slow week.&quot;
            </p>
            <div className="space-y-4">
              {revenueLeakData.slice(0, 3).map((r, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{r.label}</span>
                    <span className="font-mono text-[var(--slate)]">{money(r.amt)}/wk</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--paper)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.value * 2.2}%`, background: r.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative h-80 flex items-end justify-center gap-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="relative w-1.5 h-40 bg-[var(--paper)] rounded-full overflow-hidden">
                <div className="drip" style={{ left: 0, animationDelay: `${i * 0.6}s` }} />
              </div>
            ))}
            <div className="absolute bottom-0 w-full h-3 bg-[var(--paper)] rounded-full" />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[var(--paper)] py-24">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--rosewood-deep)] mb-3 text-center">Testimonials</p>
          <h2 className="font-display text-4xl mb-14 text-center">Salon owners, not analysts.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                q: "We found £900 a week we didn't know we were losing to empty Wednesday chairs. That's a stylist's wage, back.",
                n: 'Harriet Lowe',
                s: 'Owner, The Foxglove Rooms, Bristol',
              },
              {
                q: 'The morning briefing replaced a Monday spreadsheet I used to dread. Now I open the app with my coffee.',
                n: 'Daniel Osei',
                s: 'Owner, Osei & Co, Manchester',
              },
              {
                q: 'It told me a client of nine years was going cold before I\'d noticed. That call alone paid for the year.',
                n: 'Priya Shah',
                s: 'Owner, Shah Hair Studio, Leeds',
              },
            ].map((t, i) => (
              <div key={i} className="card p-7 fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex gap-0.5 mb-4 text-[var(--gold)]">
                  {[...Array(5)].map((_, j) => (
                    <Icon key={j} name="star" size={14} />
                  ))}
                </div>
                <p className="font-display text-lg leading-snug mb-6">&quot;{t.q}&quot;</p>
                <p className="text-sm font-semibold">{t.n}</p>
                <p className="text-xs text-[var(--slate)]">{t.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--rosewood-deep)] mb-3 text-center">Pricing</p>
        <h2 className="font-display text-4xl mb-14 text-center">Priced per chair, not per headache.</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              n: 'Studio',
              p: '£89',
              d: 'Up to 4 chairs',
              f: ['Daily AI briefing', 'Revenue leak analysis', 'No-show prediction'],
              pop: false,
            },
            {
              n: 'Salon',
              p: '£179',
              d: 'Up to 10 chairs',
              f: ['Everything in Studio', 'Customer retention engine', 'Staff performance suite', 'AI business advisor'],
              pop: true,
            },
            {
              n: 'Group',
              p: "Let's talk",
              d: 'Multi-location',
              f: ['Everything in Salon', 'Cross-site benchmarking', 'Dedicated success manager'],
              pop: false,
            },
          ].map((t, i) => (
            <div key={i} className={`rounded-2xl p-7 fade-up ${t.pop ? 'bg-[var(--ink)] text-white shadow-xl scale-[1.03]' : 'card'}`} style={{ animationDelay: `${i * 80}ms` }}>
              {t.pop && <span className="text-[10px] font-bold uppercase tracking-wide bg-[var(--rosewood)] px-2.5 py-1 rounded-full">Most popular</span>}
              <h3 className="font-display text-2xl mt-4">{t.n}</h3>
              <p className={`text-xs mt-1 ${t.pop ? 'text-white/60' : 'text-[var(--slate)]'}`}>{t.d}</p>
              <p className="font-display text-4xl mt-5">{t.p} <span className="text-base font-sans font-normal">{t.p !== "Let's talk" ? '/mo' : ''}</span></p>
              <ul className="space-y-2.5 mt-6 mb-8 text-sm">
                {t.f.map((f, j) => (
                  <li key={j} className="flex items-center gap-2.5">
                    <Icon name="check" size={14} className={t.pop ? 'text-[#D98094]' : 'text-[var(--sage)]'} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push('/login')}
                className={`w-full text-center rounded-full py-3 font-semibold text-sm ${t.pop ? 'bg-white text-[var(--ink)]' : 'btn-secondary block'}`}
              >
                Get started
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--rosewood-deep)] mb-3 text-center">FAQ</p>
        <h2 className="font-display text-4xl mb-12 text-center">Questions, answered plainly.</h2>
        <div className="space-y-3">
          {[
            {
              q: 'Does this replace my booking system?',
              a: "No. Marlowe & Rose sits on top of the booking, POS and retail data you already have — it's an operations layer, not a new system to migrate into.",
            },
            {
              q: 'How does the AI make recommendations?',
              a: "It scores every appointment, customer and product against your salon's own historical patterns, then ranks the actions most likely to recover lost revenue.",
            },
            {
              q: 'Can each stylist see their own numbers?',
              a: 'Yes — staff performance can be shared individually or kept owner-only, your choice.',
            },
            {
              q: 'Is my client data secure?',
              a: "All data is encrypted in transit and at rest, and nothing is shared outside your salon's account.",
            },
          ].map((f, i) => (
            <FaqItem key={i} f={f} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--ink)] text-white/70 py-14">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Icon name="scissors" size={14} className="text-white" />
              </div>
              <span className="font-display text-lg text-white">Marlowe &amp; Rose</span>
            </div>
            <p className="text-xs max-w-xs">AI operations for independent salons across the UK, US and Europe.</p>
          </div>
          <div className="grid grid-cols-3 gap-10 text-sm">
            <div>
              <p className="text-white font-semibold mb-3 text-xs uppercase tracking-wide">Product</p>
              <ul className="space-y-2">
                <li>Features</li>
                <li>Pricing</li>
                <li>Demo</li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-3 text-xs uppercase tracking-wide">Company</p>
              <ul className="space-y-2">
                <li>About</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-3 text-xs uppercase tracking-wide">Legal</p>
              <ul className="space-y-2">
                <li>Privacy</li>
                <li>Terms</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-white/10 text-xs">
          © 2026 Marlowe &amp; Rose Revenue Intelligence. Prototype for demonstration.
        </div>
      </footer>
    </div>
  );
}
