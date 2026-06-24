"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence, easeInOut } from "framer-motion";
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
} from "lucide-react";

// ─── Animation helpers ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: easeInOut },
  }),
};

function AnimSection({
  children,
  className = "",
  delay = 0,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeUp}
      custom={delay}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Exam Paper Mockup ────────────────────────────────────────────────────────
function ExamPaperMockup() {
  const questions = [
    {
      n: "1.",
      text: "If the ratio of boys to girls is 3:2 and total students are 60, how many girls are there?",
      opts: ["A) 20", "B) 24", "C) 28", "D) 36"],
      ans: "B",
    },
    {
      n: "2.",
      text: "Which article of the Indian Constitution deals with Right to Equality?",
      opts: ["A) Article 12", "B) Article 14", "C) Article 16", "D) Article 19"],
      ans: "B",
    },
    {
      n: "3.",
      text: "Speed of sound in air at 0°C is approximately:",
      opts: ["A) 332 m/s", "B) 340 m/s", "C) 360 m/s", "D) 300 m/s"],
      ans: "A",
    },
    {
      n: "4.",
      text: "Find the simple interest on ₹5,000 at 8% p.a. for 3 years.",
      opts: ["A) ₹1,000", "B) ₹1,200", "C) ₹1,500", "D) ₹800"],
      ans: "B",
    },
  ];

  return (
    <div className="w-full max-w-[420px] rounded-lg overflow-hidden border border-[#E5E7EB] shadow-[0_20px_60px_rgba(0,0,0,0.3)] select-none bg-white"
      style={{ fontFamily: "'Times New Roman', serif", fontSize: 9 }}>
      {/* Paper header */}
      <div className="bg-[#F8FAFC] border-b-2 border-[#1E293B] px-3.5 py-2.5 text-center">
        <div className="font-black tracking-wide text-[11px]">STATE RECRUITMENT BOARD</div>
        <div className="text-[9px] text-[#475569] mt-0.5">Combined Graduate Level Examination — 2024</div>
        <div className="flex justify-between mt-1.5 text-[8px] text-[#334155]">
          <span>Paper: <b>SRB-CGL-T1</b></span>
          <span>Time: <b>60 Min</b></span>
          <span>Marks: <b>200</b></span>
        </div>
      </div>
      {/* Two-column questions */}
      <div className="grid grid-cols-2 gap-x-3 px-3 py-2.5">
        {questions.map((q, i) => (
          <div key={i} className={`mb-2.5 pb-2 ${i < 2 ? "border-b border-dashed border-[#ccc]" : ""}`}>
            <div className="font-bold leading-snug mb-1" style={{ fontSize: 8 }}>
              <span className="mr-1">{q.n}</span>
              <span className="font-normal">{q.text}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 ml-1" style={{ fontSize: 7.5 }}>
              {q.opts.map((o, j) => (
                <span
                  key={j}
                  className={o.startsWith(q.ans) ? "font-bold text-blue-600" : "text-[#334155]"}
                >
                  {o}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div className="bg-[#F8FAFC] border-t border-[#ccc] px-3.5 py-1.5 flex justify-between text-[7.5px] text-[#64748B]">
        <span>© Custom PDF Creator</span>
        <span>Page 1 of 8</span>
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ isLoggedIn }: Readonly<{ isLoggedIn: boolean }>) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 lg:px-12 ${scrolled
        ? "bg-[#FFFFFF]/90 backdrop-blur-md border-b border-slate-200"
        : "bg-transparent"
        }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center">
            <FileText className="w-4 h-4 text-slate-900" />
          </div>
          <span className="font-bold text-[17px] text-slate-900 tracking-tight">
            CustomPDF<span className="text-[#2563EB]">Creator</span>
          </span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-1">
          {["#features", "#usecases", "#faq"].map((href, i) => (
            <a
              key={i}
              href={href}
              className="px-3 py-1.5 text-[13.5px] text-slate-900/60 hover:text-slate-900 transition-colors"
            >
              {["Features", "Use Cases", "FAQ"][i]}
            </a>
          ))}
          <a
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="ml-3 px-5 py-2 rounded-lg bg-[#2563EB] text-slate-900 text-[13.5px] font-semibold hover:bg-[#1D4ED8] transition-colors"
          >
            {isLoggedIn ? "Dashboard" : "Login"} →
          </a>
        </div>
      </div>
    </motion.nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ isLoggedIn }: Readonly<{ isLoggedIn: boolean }>) {
  return (
    <section className="relative min-h-screen bg-[#FFFFFF] flex items-center overflow-hidden px-6 lg:px-12 pt-24 pb-20">
      {/* Ruled-paper texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent, transparent 27px, rgba(255,255,255,0.6) 27px, rgba(255,255,255,0.6) 28px)",
        }}
      />
      {/* Saffron glow */}
      <div className="absolute -top-40 -right-24 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)" }} />

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left copy */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-2 bg-[#2563EB]/10 border border-[#2563EB]/30 rounded-full px-3.5 py-1.5 mb-7"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] inline-block" />
            <span className="text-[11.5px] font-semibold text-[#2563EB] tracking-wide">
              Purpose-built for Indian Competitive Exams
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl lg:text-5xl xl:text-[3.4rem] font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-5"
          >
            Exam papers in
            <br />
            <span className="text-[#2563EB]">minutes,</span> not hours.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="text-[16.5px] text-slate-900/60 leading-relaxed mb-9 max-w-[480px]"
          >
            Stop wrestling with Word documents, broken alignments, and manual
            answer keys. Custom PDF Creator is the dedicated exam-paper platform
            for SSC, Banking, Railways, UPSC, JEE, NEET, and every format your
            team needs to publish.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.26 }}
            className="flex flex-wrap gap-3"
          >
            <a
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#2563EB] text-slate-900 font-bold text-[15px] hover:bg-[#1D4ED8] transition-colors shadow-[0_4px_20px_rgba(229,128,10,0.4)]"
            >
              {isLoggedIn ? "Go to Dashboard" : "Start Building Free"}
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/8 border border-white/12 text-slate-900/80 font-semibold text-[15px] hover:bg-white/12 transition-colors"
            >
              See Features
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex gap-8 mt-11 flex-wrap"
          >
            {[
              { label: "Exam Formats", value: "14+" },
              { label: "Papers Exported", value: "10K+" },
              { label: "Avg. Time Saved", value: "4 hrs" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-[22px] font-extrabold text-slate-900 tracking-tight">{s.value}</div>
                <div className="text-[11px] text-slate-900/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right — paper mockup */}
        <motion.div
          initial={{ opacity: 0, x: 36 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-end"
        >
          <div className="relative">
            <ExamPaperMockup />

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute -top-4 -right-5 bg-green-600 text-slate-900 rounded-xl px-3.5 py-2 text-[11px] font-bold shadow-[0_4px_16px_rgba(22,163,74,0.4)] flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Answer Key Auto-Generated
            </motion.div>

            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
              className="absolute -bottom-3.5 -left-5 bg-blue-600 text-slate-900 rounded-xl px-3.5 py-2 text-[11px] font-bold shadow-[0_4px_16px_rgba(37,99,235,0.4)] flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              240 questions imported
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
    "SSC CGL", "SSC CHSL", "UPSC", "JEE Mains", "NEET UG", "IBPS PO",
    "Railways RRB", "State PSC", "CUET", "Police Exams", "CTET", "University Exams",
  ];
  return (
    <div className="bg-[#F8FAFC] border-y border-slate-200 overflow-hidden py-3.5">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, duration: 24, ease: "linear" }}
        className="flex whitespace-nowrap"
      >
        {[...exams, ...exams].map((e, i) => (
          <span
            key={i}
            className="inline-block px-5 text-[12px] text-slate-900/40 font-medium border-r border-slate-200"
          >
            {e}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Why Not Word ─────────────────────────────────────────────────────────────
function WhyNotWord() {
  const rows = [
    { pain: "Manual column alignment every time", fix: "One-click 2 or 3-column layout" },
    { pain: "Answer key typed separately", fix: "Auto-generated answer key PDF" },
    { pain: "No bulk import — retype everything", fix: "Paste text or upload DOCX instantly" },
    { pain: "Local file, team can't collaborate", fix: "Cloud storage + role-based team access" },
    { pain: "Formatting breaks on every save", fix: "Pixel-perfect exam layout every export" },
    { pain: "Version chaos across team inboxes", fix: "Centralised dashboard, one source of truth" },
  ];

  return (
    <section className="bg-[#FFFFFF] py-24 px-6 lg:px-12">
      <div className="max-w-5xl mx-auto">
        <AnimSection className="text-center mb-14">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#2563EB] uppercase mb-3.5">
            vs Word & Google Docs
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#FFFFFF] tracking-tight leading-tight">
            Word was built for letters,
            <br />not exam papers.
          </h2>
          <p className="text-[15.5px] text-[#64748B] mt-4 max-w-md mx-auto leading-relaxed">
            Every hour spent fighting formatting is an hour not spent on question quality.
          </p>
        </AnimSection>

        <AnimSection delay={0.1}>
          <div className="grid grid-cols-2 rounded-2xl overflow-hidden border border-[#E5E7EB]">
            {/* Word column */}
            <div>
              <div className="bg-red-100 px-6 py-3.5 border-b border-red-200">
                <span className="flex items-center gap-2 text-[13px] font-bold text-red-800">
                  <XCircle className="w-4 h-4" /> Word / Google Docs
                </span>
              </div>
              {rows.map((r, i) => (
                <div
                  key={i}
                  className={`bg-red-50 px-6 py-3.5 text-[13.5px] text-red-900 ${i < rows.length - 1 ? "border-b border-red-100" : ""}`}
                >
                  {r.pain}
                </div>
              ))}
            </div>
            {/* Our tool column */}
            <div>
              <div className="bg-green-100 px-6 py-3.5 border-b border-green-200">
                <span className="flex items-center gap-2 text-[13px] font-bold text-green-800">
                  <CheckCircle2 className="w-4 h-4" /> Custom PDF Creator
                </span>
              </div>
              {rows.map((r, i) => (
                <div
                  key={i}
                  className={`bg-green-50 px-6 py-3.5 text-[13.5px] text-green-900 font-medium ${i < rows.length - 1 ? "border-b border-green-100" : ""}`}
                >
                  {r.fix}
                </div>
              ))}
            </div>
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
    iconBg: "bg-slate-100",
    iconColor: "text-[#2563EB]",
    badgeColor: "text-violet-600",
    badge: "Core Feature",
    title: "Bulk Question Import",
    desc: "Paste raw text or upload a DOCX. Hundreds of questions — images, options, answers — imported in seconds. Never retype a question again.",
    points: [
      "Paste text from any source",
      "DOCX upload with image preservation",
      "Auto-detect question structure",
      "Hundreds of questions in one operation",
    ],
  },
  {
    Icon: Cloud,
    iconBg: "bg-slate-100",
    iconColor: "text-[#2563EB]",
    badgeColor: "text-sky-600",
    badge: "Core Feature",
    title: "Cloud Storage & Auto-Save",
    desc: "Every edit saves automatically to secure cloud storage. No local files, no version conflicts. Open your paper from any device, anytime.",
    points: [
      "Auto-save as you type",
      "Draft & published states",
      "Continue later from any device",
      "Zero data loss guarantee",
    ],
  },
  {
    Icon: LayoutDashboard,
    iconBg: "bg-slate-100",
    iconColor: "text-[#2563EB]",
    badgeColor: "text-emerald-600",
    badge: "Core Feature",
    title: "Project Dashboard",
    desc: "A dedicated workspace for all your papers. Search, organise, rename, delete — your entire paper library at a glance.",
    points: [
      "All papers in one place",
      "Search & filter by exam type",
      "Rename and organise freely",
      "Open drafts to continue editing",
    ],
  },
  {
    Icon: Zap,
    iconBg: "bg-amber-100",
    iconColor: "text-[#2563EB]",
    badgeColor: "text-amber-600",
    badge: "Core Feature",
    title: "One-Click PDF Export",
    desc: "Export the question paper and answer key as separate, print-ready PDFs instantly. Professional SSC/JEE-style layout every time.",
    points: [
      "Separate Q-paper & Answer Key PDFs",
      "2- and 3-column layouts",
      "Bilingual English + Hindi support",
      "Accurate pagination, no broken pages",
    ],
  },
  {
    Icon: Users,
    iconBg: "bg-slate-100",
    iconColor: "text-[#2563EB]",
    badgeColor: "text-violet-600",
    badge: "Core Feature",
    title: "RBAC & User Management",
    desc: "Assign Editor or Viewer roles. Admins control who can create, edit, or only review. Perfect for coaching institutes and content teams.",
    points: [
      "Editor & Viewer roles",
      "Admin creates and manages users",
      "Viewers can export but not edit",
      "Ideal for teams of 2 to 200",
    ],
  },
  {
    Icon: ScanSearch,
    iconBg: "bg-slate-100",
    iconColor: "text-[#2563EB]",
    badgeColor: "text-teal-600",
    badge: "Quality Control",
    title: "Import Validation Engine",
    desc: "After import, the platform scans every question for missing answers, ambiguous options, and image mismatches — then jumps you to each issue.",
    points: [
      "Flags missing answers & images",
      "Low-confidence parse warnings",
      "Jump to flagged question instantly",
      "Dismiss reviewed issues",
    ],
  },
];

function Features() {
  return (
    <section id="features" className="bg-[#FFFFFF] py-24 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <AnimSection className="text-center mb-16">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#2563EB] uppercase mb-3.5">
            Platform Features
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Everything an exam team needs.
            <br />Nothing it doesn&apos;t.
          </h2>
        </AnimSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ Icon, iconBg, iconColor, badgeColor, badge, title, desc, points }, i) => (
            <AnimSection key={i} delay={i * 0.05}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.18 }}
                className="bg-white border border-slate-200 rounded-2xl p-7 h-full flex flex-col hover:border-white/20 transition-colors"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-bold tracking-widest uppercase ${badgeColor} mb-1`}>{badge}</p>
                    <h3 className="text-[15.5px] font-bold text-slate-900 leading-snug">{title}</h3>
                  </div>
                </div>
                <p className="text-[13px] text-slate-900/50 leading-relaxed mb-5">{desc}</p>
                <ul className="mt-auto flex flex-col gap-2">
                  {points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-[12.5px] text-slate-900/65">
                      <span className="text-[#2563EB] font-bold mt-px shrink-0">—</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Import Workflow ──────────────────────────────────────────────────────────
const STEPS = [
  { Icon: Upload, title: "Paste or Upload", desc: "Paste raw question text, or drop a DOCX file with embedded images and formatting." },
  { Icon: FileText, title: "Auto-Parse", desc: "The engine detects question numbers, options, answers, solutions, and images automatically." },
  { Icon: AlertTriangle, title: "Validation Scan", desc: "Every question is checked. Missing answers, bad options, image mismatches — all flagged immediately." },
  { Icon: ScanSearch, title: "Review & Fix", desc: "Jump to each flagged question with one click. Fix, dismiss, or skip. No manual searching." },
  { Icon: Zap, title: "Export PDFs", desc: "Question paper and auto-generated answer key are ready to download as separate PDFs." },
];

function ImportWorkflow() {
  return (
    <section className="bg-[#FFFFFF] py-24 px-6 lg:px-12">
      <div className="max-w-5xl mx-auto">
        <AnimSection className="mb-14">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#2563EB] uppercase mb-3.5">
            Import Workflow
          </p>
          <h2 className="text-3xl lg:text-[2.4rem] font-extrabold text-[#FFFFFF] tracking-tight leading-tight max-w-lg">
            From question bank to print-ready PDF in under 5 minutes.
          </h2>
        </AnimSection>

        <div className="relative">
          {/* Connector line */}
          <div className="absolute top-7 left-7 right-0 h-px bg-gradient-to-r from-[#2563EB] to-transparent" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-y-8 gap-x-4 relative">
            {STEPS.map(({ Icon, title, desc }, i) => (
              <AnimSection key={i} delay={i * 0.08} className="relative z-10">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 border-2 shadow-sm ${i === 0
                    ? "bg-[#2563EB] border-[#2563EB] text-slate-900"
                    : "bg-white border-[#E5E7EB] text-[#64748B]"
                    }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-[14px] font-bold text-[#FFFFFF] mb-1.5">{title}</h3>
                <p className="text-[12.5px] text-[#64748B] leading-relaxed">{desc}</p>
              </AnimSection>
            ))}
          </div>
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
      role: "Admin",
      perms: ["Create & delete users", "Assign Editor or Viewer roles", "Full access to all papers", "Manage organisation settings"],
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/25",
    },
    {
      Icon: PencilLine,
      role: "Editor",
      perms: ["Create & edit papers", "Import questions", "Export PDFs", "Manage projects"],
      color: "text-sky-400",
      bg: "bg-sky-500/10",
      border: "border-sky-500/25",
    },
    {
      Icon: Eye,
      role: "Viewer",
      perms: ["View all papers", "Review content", "Export PDFs", "Cannot edit or delete"],
      color: "text-teal-400",
      bg: "bg-teal-500/10",
      border: "border-teal-500/25",
    },
  ];

  return (
    <section className="bg-[#F8FAFC] py-24 px-6 lg:px-12">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <AnimSection>
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#2563EB] uppercase mb-3.5">
            Team Collaboration
          </p>
          <h2 className="text-3xl lg:text-[2.4rem] font-extrabold text-slate-900 tracking-tight leading-tight mb-5">
            Built for coaching teams,
            <br />not solo use.
          </h2>
          <p className="text-[15.5px] text-slate-900/55 leading-relaxed mb-8">
            Admins control exactly who can create, edit, and review papers.
            Protect confidential content while enabling smooth team workflows.
          </p>
          <ul className="flex flex-col gap-3.5">
            {[
              "Create users and assign roles from the admin panel",
              "Editors build and publish papers",
              "Viewers can review and export, but never modify",
              "Perfect for institutes with content writers and QA reviewers",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px] text-slate-900/70">
                <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </AnimSection>

        <AnimSection delay={0.1} className="flex flex-col gap-4">
          {roles.map(({ Icon, role, perms, color, bg, border }, i) => (
            <motion.div
              key={i}
              whileHover={{ x: 5 }}
              transition={{ duration: 0.15 }}
              className={`${bg} border ${border} rounded-xl p-5 flex gap-4 items-start`}
            >
              <Icon className={`w-5 h-5 ${color} shrink-0 mt-0.5`} />
              <div>
                <p className={`text-[13px] font-bold ${color} mb-2`}>{role} Role</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {perms.map((p, j) => (
                    <span key={j} className="text-[12px] text-slate-900/60">— {p}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Use Cases ────────────────────────────────────────────────────────────────
const USE_CASES = [
  { Icon: Building2, title: "Coaching Institutes", desc: "Generate weekly mock tests, chapter tests, and full-length papers with consistent formatting across your entire faculty." },
  { Icon: ShieldCheck, title: "Examination Boards", desc: "Manage multiple paper sets, bilingual papers, and confidential drafts — with strict role-based access for review committees." },
  { Icon: BookOpen, title: "Educational Publishers", desc: "Bulk import question banks, validate quality, and export publication-ready exam booklets in a fraction of the time." },
  { Icon: School, title: "Schools & Colleges", desc: "Create class tests, term papers, and university entrance formats without relying on IT teams or desktop publishing tools." },
  { Icon: Smartphone, title: "EdTech Platforms", desc: "Import, validate, and export structured question banks with a repeatable, scalable workflow your whole team can run." },
  { Icon: Feather, title: "Content Writers", desc: "Focus on question quality, not formatting. The platform handles columns, pagination, fonts, and answer keys automatically." },
];

function UseCases() {
  return (
    <section id="usecases" className="bg-[#FFFFFF] py-24 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <AnimSection className="text-center mb-14">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#2563EB] uppercase mb-3.5">
            Who It&apos;s Built For
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#FFFFFF] tracking-tight">
            Every team that makes exam papers.
          </h2>
        </AnimSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {USE_CASES.map(({ Icon, title, desc }, i) => (
            <AnimSection key={i} delay={i * 0.05}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-xl p-6 border border-[#E5E7EB] hover:border-[#2563EB]/30 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#2563EB]" />
                </div>
                <h3 className="text-[15px] font-bold text-[#FFFFFF] mb-2">{title}</h3>
                <p className="text-[13.5px] text-[#64748B] leading-relaxed">{desc}</p>
              </motion.div>
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
      name: "Rajiv Sharma",
      role: "Director, TopRank SSC Academy",
      city: "Lucknow",
    },
    {
      q: "The bulk import from our DOCX question bank was genuinely shocking. 300 questions, images and all, processed in seconds.",
      name: "Priya Iyer",
      role: "Content Head, MockTest Pro",
      city: "Chennai",
    },
    {
      q: "RBAC was the feature that sold us. Our writers can't accidentally modify a paper that's already been reviewed and approved.",
      name: "Anand Mehta",
      role: "Principal, Delhi Public Institute",
      city: "New Delhi",
    },
  ];

  return (
    <section className="bg-[#FFFFFF] py-24 px-6 lg:px-12">
      <div className="max-w-5xl mx-auto">
        <AnimSection className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Trusted by exam teams across India.
          </h2>
        </AnimSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {quotes.map((t, i) => (
            <AnimSection key={i} delay={i * 0.08}>
              <div className="bg-white border border-slate-200 rounded-2xl p-7 h-full flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-[#2563EB] text-[#2563EB]" />
                  ))}
                </div>
                <p className="text-[13.5px] text-slate-900/70 leading-relaxed mb-6 flex-1">&quot;{t.q}&quot;</p>
                <div>
                  <p className="text-[13px] font-bold text-slate-900">{t.name}</p>
                  <p className="text-[11.5px] text-slate-900/40 mt-0.5">{t.role} · {t.city}</p>
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
    q: "What exam formats does Custom PDF Creator support?",
    a: "SSC CGL, SSC CHSL, IBPS PO, SBI Clerk, RRB NTPC, UPSC Prelims, State PSC, JEE Mains & Advanced, NEET UG, CUET, CTET, Police Exams, School Exams, Coaching Institute Tests, and University Entrance Examinations.",
  },
  {
    q: "Can I import questions from an existing Word document?",
    a: "Yes. Upload your DOCX file and the platform reads question text, answer options, correct answers, solutions, and embedded images automatically. You review the import before adding questions to your paper.",
  },
  {
    q: "Does it support bilingual (English + Hindi) papers?",
    a: "Yes. You can add bilingual content at the question level, and the exported PDF will display both languages in the correct exam layout.",
  },
  {
    q: "How does the answer key generation work?",
    a: "The answer key is generated automatically from the correct answers you assign during question creation or import. It exports as a separate PDF, cleanly formatted for internal use or publication.",
  },
  {
    q: "Can multiple team members work on the same paper?",
    a: "Role-based access lets your team work with clear Editor/Viewer permission boundaries. All work is saved to cloud storage, so handoffs are seamless and no one overwrites approved content.",
  },
  {
    q: "What happens if my import has parsing errors?",
    a: "The import validation engine scans every question and flags issues — missing answers, bad option counts, low-confidence parsing, missing images. A review panel lists all issues, and clicking any one jumps you directly to that question.",
  },
  {
    q: "Is my data secure?",
    a: "All papers are stored in a secured cloud database. Only users in your organisation with the appropriate roles can access your papers. No data is stored locally, and auto-save prevents accidental loss.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-[#FFFFFF] py-24 px-6 lg:px-12">
      <div className="max-w-2xl mx-auto">
        <AnimSection className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#FFFFFF] tracking-tight">
            Frequently asked questions
          </h2>
        </AnimSection>

        <div className="flex flex-col">
          {FAQS.map((f, i) => (
            <AnimSection key={i} delay={i * 0.03}>
              <div className="border-b border-[#E5E7EB]">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full text-left py-5 flex justify-between items-center gap-4 group"
                >
                  <span className="text-[14.5px] font-semibold text-[#2563EB] leading-snug group-hover:text-[#2563EB] transition-colors">
                    {f.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#64748B] shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <p className="text-[13.5px] text-[#64748B] leading-relaxed pb-5">{f.a}</p>
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
    <section className="bg-[#F8FAFC] py-24 px-6 lg:px-12">
      <div className="max-w-2xl mx-auto text-center">
        <AnimSection>
          <div className="inline-block bg-[#2563EB]/12 border border-[#2563EB]/25 rounded-full px-5 py-1.5 mb-7 text-[11.5px] font-bold text-[#2563EB] tracking-wide">
            Start for free · No credit card required
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-5">
            Your next exam paper
            <br />is 4 minutes away.
          </h2>
          <p className="text-[16px] text-slate-900/55 leading-relaxed mb-10 max-w-lg mx-auto">
            Join coaching institutes, schools, and exam publishers who&apos;ve stopped
            fighting Word and started publishing faster.
          </p>
          <a
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2.5 px-9 py-4 rounded-xl bg-[#2563EB] text-slate-900 font-bold text-[16px] hover:bg-[#1D4ED8] transition-colors shadow-[0_4px_24px_rgba(229,128,10,0.45)]"
          >
            {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
            <ArrowRight className="w-5 h-5" />
          </a>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#FFFFFF] border-t border-slate-200 py-8 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#2563EB] flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-slate-900" />
          </div>
          <span className="font-bold text-[15px] text-slate-900">
            CustomPDF<span className="text-[#2563EB]">Creator</span>
          </span>
        </div>
        <div className="flex gap-6">
          {["Privacy Policy", "Terms of Use", "Contact"].map((l, i) => (
            <a key={i} href="#" className="text-[13px] text-slate-900/35 hover:text-slate-900/65 transition-colors">
              {l}
            </a>
          ))}
        </div>
        <p className="text-[12px] text-slate-900/25">
          © 2024 Quantumtech Digital. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

interface LandingPageProps {
  isLoggedIn: boolean;
}

// ─── Page Root ────────────────────────────────────────────────────────────────
export default function LandingPage({ isLoggedIn, }: Readonly<LandingPageProps>) {
  return (
    <main className="antialiased">
      <Navbar isLoggedIn={isLoggedIn} />
      <Hero isLoggedIn={isLoggedIn} />
      <ExamTicker />
      <WhyNotWord />
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