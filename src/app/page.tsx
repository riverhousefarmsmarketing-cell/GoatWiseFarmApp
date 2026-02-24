'use client';

import Link from 'next/link';
import { useState } from 'react';

// ─── ICON COMPONENTS ─────────────────────────────────────────
function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-[#105040] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg className={`w-5 h-5 text-[#6A7E70] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ─── FAQ ITEM ────────────────────────────────────────────────
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#DDD8D4]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left"
      >
        <span className="font-medium text-[#081810] pr-4">{question}</span>
        <ChevronDown open={open} />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-96 pb-5' : 'max-h-0'}`}>
        <p className="text-[#384E42] leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

// ─── FEATURE CARD ────────────────────────────────────────────
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-[#DDD8D4] hover:shadow-md hover:border-[#B8DCC8] transition-all duration-300">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="font-semibold text-[#081810] text-lg mb-2">{title}</h3>
      <p className="text-[#384E42] text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// ─── STEP CARD ───────────────────────────────────────────────
function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="relative flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#105040] text-white flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="pt-1">
        <h3 className="font-semibold text-[#081810] mb-1">{title}</h3>
        <p className="text-[#384E42] text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── PRICING CARD ────────────────────────────────────────────
function PricingCard({
  name, price, period, description, features, highlight, cta
}: {
  name: string; price: string; period?: string; description: string;
  features: string[]; highlight?: boolean; cta: string;
}) {
  return (
    <div className={`relative rounded-2xl p-6 md:p-8 flex flex-col ${
      highlight
        ? 'bg-[#105040] text-white shadow-xl shadow-[#B8DCC8]/40 scale-[1.02]'
        : 'bg-white border border-[#DDD8D4] shadow-sm'
    }`}>
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5E1840] text-white text-xs font-bold px-3 py-1 rounded-full">
          MOST POPULAR
        </div>
      )}
      <div className="mb-4">
        <h3 className={`font-semibold text-lg ${highlight ? 'text-white' : 'text-[#081810]'}`}>{name}</h3>
        <p className={`text-sm mt-1 ${highlight ? 'text-[#B8DCC8]' : 'text-[#6A7E70]'}`}>{description}</p>
      </div>
      <div className="mb-6">
        <span className={`text-4xl font-bold ${highlight ? 'text-white' : 'text-[#081810]'}`}>{price}</span>
        {period && <span className={`text-sm ml-1 ${highlight ? 'text-[#B8DCC8]' : 'text-[#6A7E70]'}`}>/{period}</span>}
      </div>
      <ul className="space-y-3 mb-8 flex-grow">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${highlight ? 'text-[#B8DCC8]' : 'text-[#105040]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className={highlight ? 'text-[#B8DCC8]' : 'text-[#384E42]'}>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all ${
          highlight
            ? 'bg-white text-[#105040] hover:bg-[#B8DCC8]/30'
            : 'bg-[#105040] text-white hover:bg-[#0A3228]'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

// ─── MAIN LANDING PAGE ───────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF9]/80 backdrop-blur-lg border-b border-[#DDD8D4]/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#105040] rounded-xl flex items-center justify-center">
              <span className="text-lg">🐐</span>
            </div>
            <div>
              <span className="font-bold text-xl text-[#081810] tracking-tight font-display">GoatWise</span>
              <span className="hidden sm:inline text-xs text-[#6A7E70] ml-2">by RiverHouse Farms</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#384E42]">
            <a href="#features" className="hover:text-[#105040] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#105040] transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-[#105040] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#105040] transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-[#384E42] hover:text-[#105040] transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-[#105040] text-white px-4 py-2 rounded-xl hover:bg-[#0A3228] transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Subtle grain texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-[#B8DCC8]/25 text-[#105040] text-sm font-medium px-4 py-1.5 rounded-full mb-8 border border-[#B8DCC8]/50">
              <span className="w-2 h-2 rounded-full bg-[#289878] animate-pulse" />
              Built by a goat farmer in Washington state
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#081810] tracking-tight leading-[1.1] mb-6 font-display">
              Your herd deserves
              <span className="relative inline-block ml-3">
                <span className="relative z-10">better</span>
                <span className="absolute bottom-1 left-0 right-0 h-3 bg-[#F4E4EE]/70 -rotate-1 rounded" />
              </span>
              <br />than a spreadsheet.
            </h1>

            <p className="text-lg sm:text-xl text-[#384E42] max-w-2xl mx-auto mb-10 leading-relaxed">
              GoatWise tracks your herd&#39;s health, breeding, milk production, and finances — with FAMACHA scoring, kidding calendars, and Schedule F tax export built right in.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <Link
                href="/signup"
                className="w-full sm:w-auto text-center bg-[#105040] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-[#0A3228] transition-all shadow-lg shadow-[#B8DCC8]/30 hover:shadow-xl hover:shadow-[#B8DCC8]/30 text-base"
              >
                Start Free — No Credit Card Required
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto text-center text-[#384E42] font-medium px-8 py-3.5 rounded-xl hover:bg-[#B8DCC8]/20 transition-colors text-base"
              >
                See How It Works ↓
              </a>
            </div>

            {/* Social proof line */}
            <p className="text-sm text-[#6A7E70]">
              Free forever for herds of 5 or fewer · Paid plans from $9/month
            </p>
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ──────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#DDD8D4] shadow-sm">
              <div className="text-2xl mb-3">📋</div>
              <h3 className="font-semibold text-[#081810] mb-2">Drowning in paper records?</h3>
              <p className="text-[#384E42] text-sm leading-relaxed">
                Sticky notes, binder pages, and spreadsheet tabs can&#39;t keep up with a growing herd. One lost page and you&#39;re guessing at breeding dates.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#DDD8D4] shadow-sm">
              <div className="text-2xl mb-3">🐄</div>
              <h3 className="font-semibold text-[#081810] mb-2">Generic livestock apps?</h3>
              <p className="text-[#384E42] text-sm leading-relaxed">
                Apps built for cattle don&#39;t understand FAMACHA scoring, goat-specific health conditions, or why your Nigerian Dwarf&#39;s milk production matters.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#DDD8D4] shadow-sm">
              <div className="text-2xl mb-3">😰</div>
              <h3 className="font-semibold text-[#081810] mb-2">Tax season panic?</h3>
              <p className="text-[#384E42] text-sm leading-relaxed">
                Reconstructing a year of farm expenses from receipts in a shoebox? GoatWise tracks every transaction in IRS Schedule F categories from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-20 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#081810] tracking-tight mb-4 font-display">
              Features that set GoatWise apart
            </h2>
            <p className="text-[#384E42] max-w-xl mx-auto">
              Every feature is built from real goat farming experience — not adapted from cattle software.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon="🔴"
              title="FAMACHA Scoring"
              description="Industry-standard parasite assessment with smart alerts. Score your herd and GoatWise tells you who needs treatment — no other app does this."
            />
            <FeatureCard
              icon="🤰"
              title="Breeding & Kidding"
              description="Track breedings, auto-calculate due dates (150 or 145 days), manage pregnancies with milestone tracking, and record kids with one-click herd entry."
            />
            <FeatureCard
              icon="🥛"
              title="Milk Production"
              description="Daily logs with AM/PM sessions, bulk entry for milking time, production charts, and top producer leaderboards. Track every drop."
            />
            <FeatureCard
              icon="🐕"
              title="Guardian Animals"
              description="Manage your LGDs, llamas, and donkeys. Track vaccinations, health, and predator incidents — a feature no competitor offers."
            />
            <FeatureCard
              icon="💰"
              title="Schedule F Finances"
              description="Every expense category maps to IRS Schedule F lines. Track income, expenses, and export your tax data with one click."
            />
            <FeatureCard
              icon="📚"
              title="Knowledge Base"
              description="14 breed profiles, goat-specific health conditions with symptom checker, medication references, and 14 dangerous myths debunked."
            />
          </div>

          {/* Decision Layer callout */}
          <div className="mt-10 bg-gradient-to-br from-[#B8DCC8]/20 to-[#F4E4EE]/20 rounded-2xl p-6 md:p-8 border border-[#B8DCC8]/40">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-2xl">🧠</span>
              </div>
              <div>
                <h3 className="font-bold text-[#081810] text-lg mb-2">Smart Decision Layer</h3>
                <p className="text-[#384E42] leading-relaxed mb-3">
                  GoatWise doesn&#39;t just store data — it watches for patterns. FAMACHA scores trending up? Milk production dropping? Weight loss across weigh-ins? You&#39;ll see color-coded alerts with plain-language guidance based on common farming practices.
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-[#DDD8D4]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#289878]" /> Normal
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-[#DDD8D4]">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Worth Watching
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-[#DDD8D4]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#92400E]" /> Needs Attention
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-[#DDD8D4]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#9B1C1C]" /> Action Recommended
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#081810] tracking-tight mb-4 font-display">
              Up and running in minutes
            </h2>
            <p className="text-[#384E42] max-w-xl mx-auto">
              No complicated setup. Start tracking your herd today.
            </p>
          </div>

          <div className="max-w-lg mx-auto space-y-10">
            <StepCard
              number={1}
              title="Add your herd"
              description="Create profiles for each animal with breed, lineage, health history, and photos. Import existing records from a CSV if you have them."
            />
            <StepCard
              number={2}
              title="Track daily operations"
              description="Log milk production, record FAMACHA scores and weights, add health records. Bulk entry makes milking-time logging fast."
            />
            <StepCard
              number={3}
              title="Manage breeding & kidding"
              description="Record breedings, track pregnancies with auto-calculated due dates, and register kids with automatic herd entry and lineage linking."
            />
            <StepCard
              number={4}
              title="Run your farm business"
              description="Track income and expenses in Schedule F categories. Export your tax data with one click when April comes around."
            />
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────── */}
      <section id="pricing" className="py-16 sm:py-20 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#081810] tracking-tight mb-4 font-display">
              Simple, honest pricing
            </h2>
            <p className="text-[#384E42] max-w-xl mx-auto">
              All features included at every paid tier. We don&#39;t hide health tools or breeding records behind premium plans.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            <PricingCard
              name="Starter"
              price="$0"
              description="Try it out"
              cta="Sign Up Free"
              features={[
                'Up to 5 animals',
                'All tracking features',
                'Knowledge base access',
                'No credit card required',
              ]}
            />
            <PricingCard
              name="Homestead"
              price="$9"
              period="mo"
              description="Small herds"
              cta="Start Free Trial"
              features={[
                'Up to 25 animals',
                'All features included',
                'Schedule F tax export',
                'CSV import & export',
                'Email support',
              ]}
            />
            <PricingCard
              name="Farm"
              price="$19"
              period="mo"
              description="Growing operations"
              cta="Start Free Trial"
              highlight
              features={[
                'Up to 100 animals',
                'All features included',
                'Up to 3 users',
                'Priority support',
                'Advanced reports',
              ]}
            />
            <PricingCard
              name="Ranch"
              price="$39"
              period="mo"
              description="Large operations"
              cta="Start Free Trial"
              features={[
                'Unlimited animals',
                'All features included',
                'Unlimited users',
                'API access',
                'Priority support',
              ]}
            />
          </div>

          <p className="text-center text-sm text-[#6A7E70] mt-8">
            Save 20% with annual billing. All paid plans include a 14-day free trial.
          </p>
        </div>
      </section>

      {/* ── ABOUT / TRUST ────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#B8DCC8]/25 rounded-2xl mb-6">
            <span className="text-3xl">🌿</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#081810] mb-4 font-display">
            Built by a farmer who needed this herself
          </h2>
          <p className="text-[#384E42] leading-relaxed mb-6">
            GoatWise was created by Christine Williams of RiverHouse Farms — a working goat farmer in Washington state who got tired of managing her herd with spreadsheets and sticky notes. Every feature comes from real experience, not guesswork.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[#6A7E70]">
            <span className="flex items-center gap-2">
              <CheckIcon /> Encrypted data storage
            </span>
            <span className="flex items-center gap-2">
              <CheckIcon /> Separate storage per farm
            </span>
            <span className="flex items-center gap-2">
              <CheckIcon /> Your data is never shared or sold
            </span>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section id="faq" className="py-16 sm:py-20 scroll-mt-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-[#081810] text-center mb-10 font-display">
            Frequently asked questions
          </h2>
          <div>
            <FaqItem
              question="Does it work on my phone?"
              answer="Yes. GoatWise is a responsive web app that works on any device with a browser — phone, tablet, or desktop. Take it to the barn with you."
            />
            <FaqItem
              question="What happens to my data if I cancel?"
              answer="You'll have a full export period to download all your data as CSV files. After that, your data is deleted. We never hold your records hostage."
            />
            <FaqItem
              question="Can I import my existing records?"
              answer="Yes — GoatWise includes a 5-step import wizard with downloadable CSV templates for animals, health records, breeding records, milk production, and financial data."
            />
            <FaqItem
              question="Is my data shared with other farms?"
              answer="Never. Every farm's data is completely isolated using row-level security. No farm can see another farm's data, and we will never sell your information."
            />
            <FaqItem
              question="Is this veterinary advice?"
              answer="No. GoatWise provides educational reference information and common practice patterns, not veterinary diagnoses. Always consult your veterinarian for medical decisions about your animals."
            />
            <FaqItem
              question="I raise sheep too — does GoatWise work for that?"
              answer="Many features transfer directly — FAMACHA scoring, breeding records, health tracking, and finances all work for sheep. We're goat-first, but small ruminant farmers find it useful."
            />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-[#105040]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 font-display">
            Your herd is waiting
          </h2>
          <p className="text-[#B8DCC8] text-lg mb-8 max-w-xl mx-auto">
            Start tracking with the free Starter plan — no credit card, no commitment. Just better record-keeping from day one.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-[#105040] font-semibold px-8 py-3.5 rounded-xl hover:bg-[#B8DCC8]/30 transition-colors shadow-lg text-base"
          >
            Start Free — No Credit Card Required
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="bg-[#031812] text-[#E8E0D8]/60 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#105040] rounded-lg flex items-center justify-center">
                <span className="text-sm">🐐</span>
              </div>
              <div>
                <span className="font-semibold text-white font-display">GoatWise</span>
                <span className="text-xs text-[#E8E0D8]/40 ml-2">by RiverHouse Farms</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <a href="mailto:support@goatwise.app" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm">
            © {new Date().getFullYear()} RiverHouse Farms LLC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
