'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Cloud,
  LayoutDashboard,
  Zap,
  Users,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ChevronDown,
  FileText,
  ScanSearch,
  AlertTriangle,
  PencilLine,
  Eye,
  UserCog,
  Building2,
  BookOpen,
  School,
  Smartphone,
  Feather,
  Star,
  Clock,
  TrendingUp,
  Database,
  Award,
} from 'lucide-react';
import Image from 'next/image';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const ACCENT = '#1744F2';
const ACCENT_LIGHT = '#EEF2FF';

// ─── Animation helpers ────────────────────────────────────────────────────────
function AnimSection({
  children,
  className = '',
  delay = 0,
}: Readonly<{ children: React.ReactNode; className?: string; delay?: number }>) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Counter animation ────────────────────────────────────────────────────────
function CountUp({
  end,
  suffix = '',
  prefix = '',
}: {
  end: number;
  suffix?: string;
  prefix?: string;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setVal(end);
        clearInterval(timer);
      } else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end]);
  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Exam Paper Mockup ────────────────────────────────────────────────────────
function ExamPaperMockup() {
  const questions = [
    {
      n: '1.',
      text: 'If boys:girls = 3:2 and total = 60, how many girls?',
      opts: ['A) 20', 'B) 24', 'C) 28', 'D) 36'],
      ans: 'B',
    },
    {
      n: '2.',
      text: 'Which Article deals with Right to Equality?',
      opts: ['A) Art. 12', 'B) Art. 14', 'C) Art. 16', 'D) Art. 19'],
      ans: 'B',
    },
    {
      n: '3.',
      text: 'Speed of sound in air at 0°C is approximately:',
      opts: ['A) 332 m/s', 'B) 340 m/s', 'C) 360 m/s', 'D) 300 m/s'],
      ans: 'A',
    },
    {
      n: '4.',
      text: 'Simple interest on ₹5,000 at 8% p.a. for 3 years?',
      opts: ['A) ₹1,000', 'B) ₹1,200', 'C) ₹1,500', 'D) ₹800'],
      ans: 'B',
    },
  ];
  return (
    <div
      className="w-full max-w-[400px] rounded-md overflow-hidden border border-gray-200 shadow-2xl bg-white select-none"
      style={{ fontFamily: "'Times New Roman', serif", fontSize: 9 }}
    >
      <div className="bg-gray-50 border-b-2 border-gray-900 px-4 py-3 text-center">
        <div className="font-black tracking-widest text-[10px] text-gray-900 uppercase">
          State Recruitment Board
        </div>
        <div className="text-[8px] text-gray-500 mt-0.5">
          Combined Graduate Level Examination — 2024
        </div>
        <div className="flex justify-between mt-2 text-[8px] text-gray-700">
          <span>
            Paper: <b>SRB-CGL-T1</b>
          </span>
          <span>
            Time: <b>60 Min</b>
          </span>
          <span>
            Marks: <b>200</b>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 px-3 py-3">
        {questions.map((q, i) => (
          <div
            key={i}
            className={`mb-2.5 pb-2 ${i < 2 ? 'border-b border-dashed border-gray-200' : ''}`}
          >
            <div className="font-bold leading-snug mb-1" style={{ fontSize: 8 }}>
              <span className="mr-1">{q.n}</span>
              <span className="font-normal text-gray-800">{q.text}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 ml-1" style={{ fontSize: 7.5 }}>
              {q.opts.map((o, j) => (
                <span
                  key={j}
                  className={o.startsWith(q.ans) ? 'font-bold text-gray-900' : 'text-gray-500'}
                >
                  {o}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-1.5 flex justify-between text-[7px] text-gray-400">
        <span>© TestPDF</span>
        <span>Page 1 of 8</span>
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ isLoggedIn }: Readonly<{ isLoggedIn: boolean }>) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-70 transition-all duration-300 px-6 lg:px-16 ${scrolled ? 'bg-white/95 backdrop-blur-xs border-b border-gray-100' : 'bg-transparent'}`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded bg-gray-900">
            <Image src="/testpdflogo.jpeg" alt="TestPDF" width={45} height={45} />
          </div>
          <span className="font-bold text-[18px] text-gray-900 tracking-tight">
            Test<span style={{ color: ACCENT }}>PDF</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1">
          {['#features', '#data', '#usecases', '#faq'].map((href, i) => (
            <a
              key={i}
              href={href}
              className="px-3 py-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors"
            >
              {['Features', 'Metrics', 'Use Cases', 'FAQ'][i]}
            </a>
          ))}
          <a
            href={isLoggedIn ? '/dashboard' : '/login'}
            className="ml-4 px-4 py-2 rounded text-[13px] font-medium text-white transition-colors"
            style={{ background: ACCENT }}
          >
            {isLoggedIn ? 'Dashboard →' : 'Get Started →'}
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ isLoggedIn }: Readonly<{ isLoggedIn: boolean }>) {
  return (
    <section className="relative min-h-screen bg-white flex items-center overflow-hidden px-6 lg:px-16 pt-20 pb-16">
      {/* Hairline rule top */}
      <div className="absolute top-16 left-0 right-0 h-px bg-gray-100" />

      {/* Grid dot pattern */}
      <div
        className="absolute inset-0 opacity-45  pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="max-w-6xl mx-auto w-full z-50 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded px-3 py-1 mb-8 text-[11px] font-medium tracking-widest uppercase border"
            style={{ borderColor: ACCENT, color: ACCENT, background: ACCENT_LIGHT }}
          >
            <span className="w-1 h-1 rounded-full inline-block" style={{ background: ACCENT }} />
            Purpose-built for Indian Competitive Exams
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="text-[3.2rem] lg:text-[4rem] font-black text-gray-900 leading-[1.0] tracking-tight mb-6"
          >
            Exam papers.
            <br />
            <span style={{ color: ACCENT }}>Not formatting.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="text-[16px] text-gray-500 leading-relaxed mb-8 max-w-[460px]"
          >
            The dedicated exam-paper platform for SSC, Banking, Railways, UPSC, JEE, NEET. Import
            hundreds of questions, auto-generate answer keys, export print-ready PDFs — in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22 }}
            className="flex flex-wrap gap-3 mb-12"
          >
            <a
              href={isLoggedIn ? '/dashboard' : '/login'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded text-[14px] font-semibold text-white transition-colors"
              style={{ background: ACCENT }}
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Start Building Free'}
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded text-[14px] font-medium text-gray-700 border border-gray-200 hover:border-gray-400 transition-colors bg-white"
            >
              See Features
            </a>
          </motion.div>

          {/* Inline stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex gap-8 pt-8 border-t border-gray-100"
          >
            {[
              { val: '14', suf: '+', label: 'Exam formats' },
              { val: '10000', suf: '+', label: 'Papers exported' },
              { val: '4', suf: ' hrs', label: 'Avg. time saved per paper' },
              { val: '99', suf: '%', label: 'Layout accuracy' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[22px] font-black text-gray-900 tracking-tight leading-none">
                  {i === 1 ? <CountUp end={10000} suffix="+" /> : `${s.val}${s.suf}`}
                </span>
                <span className="text-[11px] text-gray-400 mt-1">{s.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center lg:justify-end"
        >
          <div className="relative">
            <ExamPaperMockup />
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute -top-4 -right-4 bg-gray-900 text-white rounded px-3 py-2 text-[11px] font-medium shadow-xl flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              Answer key auto-generated
            </motion.div>
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 0.6 }}
              className="absolute -bottom-3 -left-4 bg-white border border-gray-200 text-gray-900 rounded px-3 py-2 text-[11px] font-medium shadow-xl flex items-center gap-1.5"
            >
              <Upload className="w-3 h-3" style={{ color: ACCENT }} />
              240 questions imported in 8s
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Exam Ticker ──────────────────────────────────────────────────────────────
function ExamTicker() {
  const exams = [
    'SSC CGL',
    'SSC CHSL',
    'UPSC Prelims',
    'JEE Mains',
    'NEET UG',
    'IBPS PO',
    'SBI Clerk',
    'Railways RRB',
    'State PSC',
    'CUET',
    'CTET',
    'Police Exams',
    'University Exams',
    'NDA',
    'CDS',
  ];
  return (
    <div className="border-y border-gray-100 overflow-hidden py-3 bg-gray-50">
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
        className="flex whitespace-nowrap"
      >
        {[...exams, ...exams].map((e, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 px-6 text-[11px] text-gray-400 font-medium"
          >
            <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
            {e}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Data Metrics Section ─────────────────────────────────────────────────────
function MetricsSection() {
  const metrics = [
    {
      Icon: Clock,
      stat: '4.2 hrs',
      label: 'average time saved per paper vs Word',
      sub: 'Based on 500+ user sessions tracked in 2024',
    },
    {
      Icon: TrendingUp,
      stat: '6.8×',
      label: 'faster exports compared to manual layout',
      sub: 'Median: 52 min (Word) → 7.6 min (TestPDF)',
    },
    {
      Icon: Database,
      stat: '300+',
      label: 'questions processed per import batch',
      sub: 'Max tested: 480 Q with 120 embedded images',
    },
    {
      Icon: Award,
      stat: '99.2%',
      label: 'layout accuracy on print output',
      sub: 'Across A4 & Legal, 2-col & 3-col formats',
    },
    {
      Icon: Users,
      stat: '2,400+',
      label: 'active teams across 18 Indian states',
      sub: 'Coaching institutes, publishers, boards',
    },
    {
      Icon: ShieldCheck,
      stat: '0 sec',
      label: 'manual alignment time per export',
      sub: 'Columns, pagination & headers are automatic',
    },
  ];
  return (
    <section id="data" className="bg-gray-900 py-24 px-6 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <AnimSection className="mb-14">
          <p
            className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: ACCENT }}
          >
            Platform Metrics
          </p>
          <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight max-w-xl">
            Numbers that tell the story.
          </h2>
          <p className="text-[15px] text-gray-400 mt-3 max-w-md">
            Real data from real teams using TestPDF in production.
          </p>
        </AnimSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-700">
          {metrics.map(({ Icon, stat, label, sub }, i) => (
            <AnimSection
              key={i}
              delay={i * 0.06}
              className="bg-gray-900 p-8 hover:bg-gray-800 transition-colors"
            >
              <Icon className="w-5 h-5 text-gray-500 mb-5" />
              <div className="text-[3rem] font-black text-white tracking-tight leading-none mb-2">
                {stat}
              </div>
              <div className="text-[13px] text-gray-300 font-medium mb-2 leading-snug">{label}</div>
              <div className="text-[11px] text-gray-600 leading-relaxed">{sub}</div>
            </AnimSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Comparison Table ─────────────────────────────────────────────────────────
function ComparisonTable() {
  const rows = [
    { feature: 'Column layout', word: 'Manual drag + align', us: '1-click 2 or 3-col' },
    { feature: 'Answer key', word: 'Type separately, error-prone', us: 'Auto-generated on export' },
    {
      feature: 'Bulk import',
      word: 'None — retype every question',
      us: 'Paste text or upload DOCX',
    },
    {
      feature: 'Bilingual support',
      word: 'Manual font switching',
      us: 'English + Hindi per question',
    },
    {
      feature: 'Team collaboration',
      word: 'Email attachments, version chaos',
      us: 'Cloud + role-based access',
    },
    {
      feature: 'Image handling',
      word: 'Breaks on resize / copy-paste',
      us: 'Preserved through import & export',
    },
    { feature: 'Validation', word: 'Manual proofreading', us: 'Auto-scan flags every issue' },
    { feature: 'Time per 100 questions', word: '~3.5 hours', us: '~28 minutes' },
  ];
  return (
    <section className="bg-white py-24 px-6 lg:px-16 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <AnimSection className="mb-14">
          <p
            className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: ACCENT }}
          >
            vs Word & Google Docs
          </p>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-tight">
            Word was built for letters,
            <br />
            not exam papers.
          </h2>
          <p className="text-[15px] text-gray-500 mt-3 max-w-md">
            Every hour wrestling with formatting is an hour not spent on question quality.
          </p>
        </AnimSection>
        <AnimSection delay={0.1}>
          <div className="overflow-hidden border border-gray-200 rounded-md">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest bg-gray-50 w-[30%]">
                    Feature
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-widest bg-red-50 text-red-400 w-[35%]">
                    <span className="flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />
                      Word / Google Docs
                    </span>
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-widest bg-green-50 text-green-600 w-[35%]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      TestPDF
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className="px-5 py-3 text-[13px] font-medium text-gray-700">{r.feature}</td>
                    <td className="px-5 py-3 text-[13px] text-red-600">{r.word}</td>
                    <td className="px-5 py-3 text-[13px] text-gray-900 font-medium">{r.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Core Features ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    Icon: Upload,
    title: 'Bulk Question Import',
    spec: 'Up to 480 Q per batch',
    desc: 'Paste raw text or upload a DOCX. Hundreds of questions — images, options, answers — imported in seconds. Auto-detect question structure.',
    points: [
      'Paste from any text source',
      'DOCX upload with image preservation',
      'Auto-detect Q structure + answers',
      'Processes 300 questions in ~8 seconds',
    ],
  },
  {
    Icon: Cloud,
    title: 'Cloud Storage & Auto-Save',
    spec: 'Zero data loss guaranteed',
    desc: 'Every edit auto-saves. No local files, no version conflicts. Open your paper from any device and continue exactly where you left off.',
    points: [
      'Auto-save on every keystroke',
      'Draft & published states',
      'Continue from any device',
      '30-day revision history',
    ],
  },
  {
    Icon: LayoutDashboard,
    title: 'Project Dashboard',
    spec: 'Unlimited papers',
    desc: 'A dedicated workspace for all your papers. Search, organise, rename, delete — your entire paper library at a glance, team-wide.',
    points: [
      'All papers in one place',
      'Filter by exam type or status',
      'Search across 1000s of questions',
      'Team-wide visibility by role',
    ],
  },
  {
    Icon: Zap,
    title: 'One-Click PDF Export',
    spec: '< 4 seconds per export',
    desc: 'Export question paper and answer key as separate, print-ready PDFs instantly. Professional SSC/JEE-style layout every time.',
    points: [
      'Separate Q-paper & answer key',
      '2-col and 3-col layouts',
      'Bilingual English + Hindi',
      'Accurate pagination, A4 & Legal',
    ],
  },
  {
    Icon: Users,
    title: 'RBAC & Team Access',
    spec: 'Teams of 2 to 200+',
    desc: 'Assign Editor or Viewer roles. Admins control who can create, edit, or only review. Built for coaching institutes and content teams.',
    points: [
      'Admin, Editor, Viewer roles',
      'Viewer can export, never edit',
      'Create unlimited team members',
      'Audit trail of all changes',
    ],
  },
  {
    Icon: ScanSearch,
    title: 'Import Validation Engine',
    spec: 'Catches 100% of parse errors',
    desc: 'After import, every question is scanned for missing answers, ambiguous options, and image mismatches — then jumps you to each issue.',
    points: [
      'Flags missing answers + images',
      'Low-confidence parse warnings',
      'Jump to flagged Q instantly',
      'Dismiss reviewed issues with one click',
    ],
  },
];

function Features() {
  return (
    <section id="features" className="bg-white py-24 px-6 lg:px-16 border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
        <AnimSection className="mb-16">
          <p
            className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: ACCENT }}
          >
            Platform Features
          </p>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-tight">
            Everything an exam team needs.
            <br />
            Nothing it doesn&apos;t.
          </h2>
        </AnimSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ Icon, title, spec, desc, points }, i) => (
            <AnimSection key={i} delay={i * 0.05}>
              <div className="border border-gray-200 rounded-md p-7 h-full flex flex-col hover:border-gray-400 transition-colors">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-9 h-9 rounded flex items-center justify-center bg-gray-100">
                    <Icon className="w-4 h-4 text-gray-700" />
                  </div>
                  <span
                    className="text-[10px] font-semibold rounded px-2 py-0.5"
                    style={{ background: ACCENT_LIGHT, color: ACCENT }}
                  >
                    {spec}
                  </span>
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-[12.5px] text-gray-500 leading-relaxed mb-5 flex-1">{desc}</p>
                <ul className="border-t border-gray-100 pt-4 flex flex-col gap-1.5">
                  {points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-[12px] text-gray-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Import Workflow ──────────────────────────────────────────────────────────
const STEPS = [
  {
    Icon: Upload,
    title: 'Paste or Upload',
    time: '~3 sec',
    desc: 'Paste raw question text, or drop a DOCX file with embedded images and formatting.',
  },
  {
    Icon: FileText,
    title: 'Auto-Parse',
    time: '~8 sec',
    desc: 'Question numbers, options, correct answers, solutions, and images — all detected automatically.',
  },
  {
    Icon: AlertTriangle,
    title: 'Validation Scan',
    time: '~2 sec',
    desc: 'Every question is checked. Missing answers, bad options, image mismatches — all flagged immediately.',
  },
  {
    Icon: ScanSearch,
    title: 'Review & Fix',
    time: 'Your pace',
    desc: 'Jump to each flagged question with one click. Fix, dismiss, or skip without manual searching.',
  },
  {
    Icon: Zap,
    title: 'Export PDFs',
    time: '< 4 sec',
    desc: 'Question paper and auto-generated answer key are separate, print-ready PDFs.',
  },
];

function ImportWorkflow() {
  return (
    <section className="bg-gray-50 py-24 px-6 lg:px-16 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <AnimSection className="mb-16">
          <p
            className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: ACCENT }}
          >
            Import Workflow
          </p>
          <h2 className="text-3xl lg:text-[2.4rem] font-black text-gray-900 tracking-tight leading-tight max-w-lg">
            From question bank to print-ready PDF in under 5 minutes.
          </h2>
          <p className="text-[15px] text-gray-500 mt-3">
            Median total time for 100 questions:{' '}
            <strong className="text-gray-900">28 minutes</strong>. Including validation and review.
          </p>
        </AnimSection>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {STEPS.map(({ Icon, title, time, desc }, i) => (
            <AnimSection key={i} delay={i * 0.08}>
              <div className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-5 left-[calc(100%_-_0px)] w-4 h-px bg-gray-300 z-10" />
                )}
                <div
                  className={`w-10 h-10 rounded flex items-center justify-center mb-4 ${i === 0 ? 'text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
                  style={i === 0 ? { background: ACCENT } : {}}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div
                  className="text-[10px] font-bold tracking-widest uppercase mb-1"
                  style={{ color: ACCENT }}
                >
                  {time}
                </div>
                <h3 className="text-[13.5px] font-bold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-[12px] text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </AnimSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── RBAC Section ─────────────────────────────────────────────────────────────
function RBACSection() {
  const roles = [
    {
      Icon: UserCog,
      role: 'Admin',
      perms: [
        'Create & delete users',
        'Assign roles',
        'Full paper access',
        'Manage org settings',
        'View audit logs',
      ],
      border: 'border-gray-900',
      badge: 'bg-gray-900 text-white',
    },
    {
      Icon: PencilLine,
      role: 'Editor',
      perms: ['Create & edit papers', 'Import questions', 'Export PDFs', 'Manage own projects'],
      border: 'border-gray-300',
      badge: 'bg-gray-100 text-gray-700',
    },
    {
      Icon: Eye,
      role: 'Viewer',
      perms: ['View all papers', 'Review content', 'Export PDFs', 'Cannot edit or delete'],
      border: 'border-gray-200',
      badge: 'bg-gray-50 text-gray-500',
    },
  ];
  return (
    <section className="bg-white py-24 px-6 lg:px-16 border-t border-gray-100">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <AnimSection>
          <p
            className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: ACCENT }}
          >
            Team Collaboration
          </p>
          <h2 className="text-3xl lg:text-[2.4rem] font-black text-gray-900 tracking-tight leading-tight mb-5">
            Built for coaching teams,
            <br />
            not solo use.
          </h2>
          <p className="text-[15px] text-gray-500 leading-relaxed mb-8">
            Admins control exactly who can create, edit, and review papers. Protect confidential
            content while enabling smooth team workflows.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { n: '2–200+', l: 'team members per org' },
              { n: '3', l: 'distinct permission levels' },
              { n: '100%', l: 'audit trail coverage' },
              { n: '0', l: 'accidental overwrites' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-md px-4 py-3 border border-gray-100">
                <div className="text-[20px] font-black text-gray-900">{s.n}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </AnimSection>
        <AnimSection delay={0.1} className="flex flex-col gap-3">
          {roles.map(({ Icon, role, perms, border, badge }, i) => (
            <div key={i} className={`border rounded-md p-5 flex gap-4 items-start ${border}`}>
              <Icon className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded ${badge}`}>
                    {role}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {perms.map((p, j) => (
                    <span key={j} className="text-[11.5px] text-gray-500 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0 inline-block" />
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Use Cases ────────────────────────────────────────────────────────────────
const USE_CASES = [
  {
    Icon: Building2,
    title: 'Coaching Institutes',
    stat: 'Saves 20+ hrs/month',
    desc: 'Weekly mocks, chapter tests, full-length papers — consistent formatting across your entire faculty team.',
  },
  {
    Icon: ShieldCheck,
    title: 'Examination Boards',
    stat: 'Strict access control',
    desc: 'Multiple paper sets, bilingual formats, confidential drafts — with role-based access for review committees.',
  },
  {
    Icon: BookOpen,
    title: 'Educational Publishers',
    stat: '10× faster production',
    desc: 'Bulk import question banks, validate quality, export publication-ready booklets at scale.',
  },
  {
    Icon: School,
    title: 'Schools & Colleges',
    stat: 'No IT team needed',
    desc: 'Class tests, term papers, university entrance formats — without desktop publishing tools or IT support.',
  },
  {
    Icon: Smartphone,
    title: 'EdTech Platforms',
    stat: 'Repeatable workflow',
    desc: 'Import, validate, and export structured question banks with a scalable workflow your whole team can run.',
  },
  {
    Icon: Feather,
    title: 'Content Writers',
    stat: 'Zero formatting work',
    desc: 'Focus on question quality. Columns, pagination, fonts, and answer keys are handled automatically.',
  },
];

function UseCases() {
  return (
    <section id="usecases" className="bg-gray-50 py-24 px-6 lg:px-16 border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
        <AnimSection className="mb-14">
          <p
            className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: ACCENT }}
          >
            Who It&apos;s Built For
          </p>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
            Every team that makes exam papers.
          </h2>
        </AnimSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {USE_CASES.map(({ Icon, title, stat, desc }, i) => (
            <AnimSection key={i} delay={i * 0.05}>
              <div className="bg-white rounded-md p-6 border border-gray-200 hover:border-gray-400 transition-colors h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded flex items-center justify-center bg-gray-100">
                    <Icon className="w-4 h-4 text-gray-700" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                    {stat}
                  </span>
                </div>
                <h3 className="text-[14px] font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-[12.5px] text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </AnimSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const quotes = [
    {
      q: "We used to spend 6 hours formatting a single paper in Word. Now it's done in under 40 minutes, including the answer key.",
      name: 'Rajiv Sharma',
      role: 'Director, TopRank SSC Academy',
      city: 'Lucknow',
      saving: '5.3 hrs saved',
    },
    {
      q: 'The bulk import from our DOCX question bank was genuinely shocking. 300 questions, images and all, processed in seconds.',
      name: 'Priya Iyer',
      role: 'Content Head, MockTest Pro',
      city: 'Chennai',
      saving: '300 Q in 8 sec',
    },
    {
      q: "RBAC was the feature that sold us. Our writers can't accidentally modify a paper that's already been reviewed and approved.",
      name: 'Anand Mehta',
      role: 'Principal, Delhi Public Institute',
      city: 'New Delhi',
      saving: 'Zero overwrites',
    },
  ];
  return (
    <section className="bg-white py-24 px-6 lg:px-16 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <AnimSection className="mb-14">
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
            Trusted by exam teams across India.
          </h2>
          <p className="text-[14px] text-gray-400 mt-2">
            2,400+ teams in 18 states. Real results, real numbers.
          </p>
        </AnimSection>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {quotes.map((t, i) => (
            <AnimSection key={i} delay={i * 0.08}>
              <div className="border border-gray-200 rounded-md p-7 h-full flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-3 h-3 fill-gray-900 text-gray-900" />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 text-gray-500">
                    {t.saving}
                  </span>
                </div>
                <p className="text-[13px] text-gray-700 leading-relaxed mb-6 flex-1">
                  &quot;{t.q}&quot;
                </p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-[12.5px] font-bold text-gray-900">{t.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {t.role} · {t.city}
                  </p>
                </div>
              </div>
            </AnimSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'What exam formats does Test PDF support?',
    a: '14 formats: SSC CGL, SSC CHSL, IBPS PO, SBI Clerk, RRB NTPC, UPSC Prelims, State PSC, JEE Mains & Advanced, NEET UG, CUET, CTET, Police Exams, School Exams, and University Entrance Examinations.',
  },
  {
    q: 'How many questions can I import at once?',
    a: 'The platform is tested and validated up to 480 questions per import batch, including embedded images. Typical imports of 100–200 questions process in 5–12 seconds depending on image count.',
  },
  {
    q: 'Can I import from an existing Word document?',
    a: 'Yes. Upload your DOCX and the platform reads question text, answer options, correct answers, solutions, and embedded images automatically. You review before confirming the import.',
  },
  {
    q: 'Does it support bilingual (English + Hindi) papers?',
    a: 'Yes. Add bilingual content at the question level, and the exported PDF displays both languages in the correct exam layout.',
  },
  {
    q: 'How does the answer key work?',
    a: 'The answer key is generated automatically from the correct answers assigned during creation or import. It exports as a separate, cleanly formatted PDF — in under 4 seconds.',
  },
  {
    q: 'What happens if my import has parsing errors?',
    a: 'The validation engine scans every question and flags issues — missing answers, bad option counts, low-confidence parsing, image mismatches. A review panel lists all issues; clicking any one jumps you directly to that question.',
  },
  {
    q: 'Is my data secure?',
    a: 'All papers are stored in a secured cloud database behind role-based access. No data is stored locally. Auto-save prevents accidental loss, and a 30-day revision history lets you recover any version.',
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="bg-gray-50 py-24 px-6 lg:px-16 border-t border-gray-100">
      <div className="max-w-2xl mx-auto">
        <AnimSection className="mb-12">
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
            Frequently asked questions.
          </h2>
        </AnimSection>
        <div className="flex flex-col">
          {FAQS.map((f, i) => (
            <AnimSection key={i} delay={i * 0.03}>
              <div className="border-b border-gray-200">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full text-left py-5 flex justify-between items-center gap-4 group"
                >
                  <span className="text-[14px] font-semibold text-gray-900 leading-snug group-hover:text-gray-600 transition-colors">
                    {f.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="text-[13.5px] text-gray-500 leading-relaxed pb-5">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </AnimSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function CTA({ isLoggedIn }: Readonly<{ isLoggedIn: boolean }>) {
  return (
    <section className="bg-gray-900 py-24 px-6 lg:px-16">
      <div className="max-w-2xl mx-auto text-center">
        <AnimSection>
          <p
            className="text-[10px] font-bold tracking-[0.2em] uppercase mb-5"
            style={{ color: ACCENT }}
          >
            Start for free · No credit card required
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-5">
            Your next exam paper
            <br />
            is 4 minutes away.
          </h2>
          <p className="text-[15px] text-gray-400 leading-relaxed mb-10 max-w-lg mx-auto">
            Join 2,400+ teams who&apos;ve stopped wrestling with Word and started publishing faster.
          </p>
          <a
            href={isLoggedIn ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded text-[15px] font-semibold text-white transition-colors"
            style={{ background: ACCENT }}
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
            <ArrowRight className="w-5 h-5" />
          </a>
          <div className="flex items-center justify-center gap-6 mt-8 text-[12px] text-gray-600">
            {['Free to start', 'No credit card', '2,400+ teams trust us'].map((l, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-gray-600" />
                {l}
              </span>
            ))}
          </div>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-8 px-6 lg:px-16">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gray-900 flex items-center justify-center">
            <FileText className="w-3 h-3 text-white" />
          </div>
          <span className="font-semibold text-[14px] text-gray-900">
            Test<span style={{ color: ACCENT }}>PDF</span>
          </span>
        </div>
        <div className="flex gap-6">
          {['Privacy Policy', 'Terms of Use', 'Contact'].map((l, i) => (
            <a
              key={i}
              href="#"
              className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors"
            >
              {l}
            </a>
          ))}
        </div>
        <p className="text-[12px] text-gray-300">
          © 2024 Quantumtech Digital. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

// ─── Page Root ────────────────────────────────────────────────────────────────
interface LandingPageProps {
  isLoggedIn: boolean;
}

export default function LandingPage({ isLoggedIn }: Readonly<LandingPageProps>) {
  return (
    <main className="antialiased">
      <Navbar isLoggedIn={isLoggedIn} />
      <Hero isLoggedIn={isLoggedIn} />
      <ExamTicker />
      <MetricsSection />
      <ComparisonTable />
      <Features />
      <ImportWorkflow />
      <RBACSection />
      <UseCases />
      <Testimonials />
      <FAQ />
      <CTA isLoggedIn={isLoggedIn} />
      <Footer />
    </main>
  );
}
