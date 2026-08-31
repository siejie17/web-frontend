"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardList, Clock3, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { administrationApi, Assessment } from "@/lib/administrationApi";
import { ErrorState, LoadingState, StatusBadge } from "./AdminUI";

type DashboardData = {
  metrics: { users: number; assessments: number; actual_review: number; facilitators: number };
  status_distribution: Record<string, number>;
  certification_distribution: Record<string, number>;
  recent_assessments: Assessment[];
  recent_references: Array<{ id: number; title: string; category?: string }>;
};

const CHART_COLORS = ["#3e6b52", "#78a187", "#c08a3e", "#54758f", "#a9685b", "#9a8cb3"];
const STATUS_CHART_COLORS: Record<string, string> = {
  actual_review: "#356b4d",
  certified: "#c08a3e",
};
const CERTIFICATION_CHART_COLORS: Record<string, string> = {
  certified: "#3e6b52",
  platinum: "#77868c",
  gold: "#c08a3e",
  silver: "#9da5aa",
  "not certified": "#a9685b",
  unclassified: "#8b918d",
};

function formatLabel(value: string) {
  const labels: Record<string, string> = {
    actual_review: "Actual Review",
    certified: "Certified",
  };
  return labels[value] || value.replaceAll("_", " ");
}

function DonutChart({ entries }: { entries: Array<[string, number]> }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const segments = entries.map(([label, count], index) => {
    const length = total ? (count / total) * circumference : 0;
    const previousLength = entries
      .slice(0, index)
      .reduce((sum, [, previousCount]) => sum + (total ? (previousCount / total) * circumference : 0), 0);
    return { label, count, index, length, offset: -previousLength };
  });

  return <div className="grid items-center gap-5 sm:grid-cols-[190px_1fr] sm:gap-7 xl:grid-cols-[210px_1fr]">
    <div className="relative mx-auto h-44 w-44 sm:h-47 sm:w-47 xl:h-49 xl:w-49">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90 drop-shadow-[0_10px_18px_rgba(62,107,82,0.12)]" role="img" aria-label="Assessment status distribution">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#edf0eb" strokeWidth="18" />
        {segments.map(({ label, index, length, offset }) => <circle
          key={`visual-${label}`}
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={STATUS_CHART_COLORS[label] || CHART_COLORS[index % CHART_COLORS.length]}
          strokeWidth={hovered === index ? 21 : 18}
          strokeDasharray={`${length} ${circumference - length}`}
          strokeDashoffset={offset}
          strokeLinecap={entries.length === 1 ? "round" : "butt"}
          className="pointer-events-none"
          opacity={hovered === null || hovered === index ? 1 : 0.42}
          style={{
            filter: hovered === index ? "drop-shadow(0 3px 4px rgba(62, 107, 82, 0.28))" : "drop-shadow(0 0 0 transparent)",
            transition: "stroke-width 700ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms ease, filter 500ms ease",
          }}
        />)}
        {segments.map(({ label, count, index, length, offset }) => <circle
          key={`target-${label}`}
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="transparent"
          strokeWidth="24"
          strokeDasharray={`${length} ${circumference - length}`}
          strokeDashoffset={offset}
          strokeLinecap={entries.length === 1 ? "round" : "butt"}
          className="cursor-pointer outline-none"
          pointerEvents="stroke"
          onMouseEnter={() => setHovered(index)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(index)}
          onBlur={() => setHovered(null)}
          tabIndex={0}
        ><title>{formatLabel(label)}: {count} ({total ? Math.round((count / total) * 100) : 0}%)</title></circle>)}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-9 text-center">
        <span className="text-3xl font-bold text-[#173b2a]">{total}</span>
        <span className="mt-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#78837b]">Total</span>
      </div>
    </div>
    <div className="space-y-2">{entries.map(([status, count], index) => <button key={status} type="button" onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition-[background-color,box-shadow] duration-1000 ease-[cubic-bezier(0.45,0,0.55,1)] ${hovered === index ? "bg-[#f0f5f0] shadow-sm ring-1 ring-[#dce6dd]" : "hover:bg-[#f7f9f6]"}`}><span className="flex min-w-0 items-center gap-2.5 text-sm capitalize text-[#59675e]"><span className={`h-3 w-3 shrink-0 rounded-full shadow-[0_0_0_3px_rgba(62,107,82,0.08)] transition-transform duration-1000 ease-[cubic-bezier(0.45,0,0.55,1)] ${hovered === index ? "scale-110" : "scale-100"}`} style={{ backgroundColor: STATUS_CHART_COLORS[status] || CHART_COLORS[index % CHART_COLORS.length] }} />{formatLabel(status)}</span><span className="text-sm font-bold text-[#173b2a]">{count}<span className="ml-1 font-normal text-[#7e8982]">{total ? Math.round((count / total) * 100) : 0}%</span></span></button>)}</div>
  </div>;
}

function CertificationBarChart({ entries }: { entries: Array<[string, number]> }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...entries.map(([, count]) => count), 1);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (!entries.length) return <div className="flex h-61 items-center justify-center rounded-2xl bg-[#f7f8f5] text-sm text-[#849089]">No certification data yet.</div>;

  return <div className="relative h-61 min-w-0 pt-5">
    <div className="pointer-events-none absolute inset-x-0 top-8 bottom-9 flex flex-col justify-between">{[100, 75, 50, 25, 0].map((tick) => <div key={tick} className="flex items-center gap-2"><span className="w-8 text-right text-xs text-[#87928b]">{tick}%</span><span className="h-px flex-1 border-t border-dashed border-[#e4e8e2]" /></div>)}</div>
    <div className="absolute inset-x-5 bottom-0 top-3 flex items-end gap-1 pl-5 sm:inset-x-8 sm:gap-3">{entries.slice(0, 7).map(([level, count], index) => {
      const active = hovered === index;
      const barColor = CERTIFICATION_CHART_COLORS[level.trim().toLowerCase()] || CHART_COLORS[index % CHART_COLORS.length];
      return <button key={level} type="button" onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end outline-none" aria-label={`${level}: ${count} assessments`}>
        <div className={`absolute left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg bg-[#173b2a] px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-lg transition-all ${active ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`} style={{ bottom: `${Math.max((count / max) * 160, 12) + 31}px` }}>{count} assessments · {total ? Math.round((count / total) * 100) : 0}%</div>
        <div className="mb-2 text-center text-sm font-bold text-[#173b2a] transition-transform group-hover:-translate-y-1">{count}</div>
        <div className={`mx-auto w-full max-w-17 origin-bottom rounded-t-xl shadow-[inset_0_1px_rgba(255,255,255,0.35)] transition-all duration-300 ${active ? "scale-x-105 brightness-105 drop-shadow-lg" : "group-hover:scale-x-105"}`} style={{ height: `${Math.max((count / max) * 160, 12)}px`, background: `linear-gradient(180deg, ${barColor}, color-mix(in srgb, ${barColor} 82%, #173b2a))` }} />
        <div className={`mt-2 w-full truncate rounded-md px-1 py-1 text-center text-xs font-medium transition ${active ? "bg-[#eef3ee] text-[#315b45]" : "text-[#5f6e65]"}`} title={level}>{level}</div>
      </button>;
    })}</div>
  </div>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { administrationApi<DashboardData>("admin/dashboard").then(setData).catch((e) => setError(e.message)); }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  const cards = [
    ["Clients", data.metrics.users, Users, "Registered client accounts"],
    ["Assessments", data.metrics.assessments, ClipboardList, "All submitted projects"],
    ["Actual Review", data.metrics.actual_review, Clock3, "Evidence and reviewer decisions in progress"],
    ["Facilitators", data.metrics.facilitators, BadgeCheck, "Available specialists"],
  ] as const;
  const metricTones = [
    { accent: "bg-[#3e6b52]", icon: "bg-[#e7f1e9] text-[#356247] ring-[#d5e5d9]" },
    { accent: "bg-[#6e927d]", icon: "bg-[#edf3ee] text-[#52705e] ring-[#dce7df]" },
    { accent: "bg-[#c08a3e]", icon: "bg-[#fff4df] text-[#936622] ring-[#f1dfbd]" },
    { accent: "bg-[#54758f]", icon: "bg-[#eaf1f6] text-[#466b86] ring-[#d7e4ec]" },
    { accent: "bg-[#5d8970]", icon: "bg-[#e9f2eb] text-[#47745a] ring-[#d7e6dc]" },
  ] as const;

  const statusEntries = Object.entries(data.status_distribution || {});
  const certificationEntries = Object.entries(data.certification_distribution || {});

  return <>
    <section className="mb-6 flex flex-col gap-6 rounded-2xl border border-[#47795e] bg-linear-to-r from-[#2f6849] to-[#4f8566] px-5 py-5 shadow-[0_14px_32px_rgba(36,82,57,0.16)] sm:mb-8 sm:px-8 sm:py-6 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">Administration overview</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">Operational clarity, at a glance.</h1>
        <p className="mt-2 text-base leading-7 text-white/90">Monitor assessment flow, coordinate facilitator reviews, and keep guidance current without changing the client experience.</p>
      </div>
      <div className="grid shrink-0 gap-3 min-[430px]:grid-cols-2 xl:flex xl:flex-wrap">
        <Link href="/admin/assessments" className="rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#285b40] shadow-sm transition hover:bg-[#f0f6f2]">Review assessments</Link>
        <Link href="/admin/users" className="rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#285b40] shadow-sm transition hover:bg-[#f0f6f2]">Manage appointments</Link>
      </div>
    </section>

    <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon, note], index) => {
      const tone = metricTones[index];
      return <div key={label} className="group relative overflow-hidden rounded-3xl border border-[#dfe5df] bg-linear-to-br from-white to-[#fafcf9] shadow-[0_8px_24px_rgba(30,38,33,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-[#bdcdbf] hover:shadow-[0_16px_34px_rgba(30,38,33,0.10)]">
        <span className={`block h-1.5 ${tone.accent}`} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-base font-bold leading-6 text-[#526159]">{label}</p><p className="mt-1.5 text-2xl font-bold leading-none tracking-tight text-[#173b2a]">{value}</p></div>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-105 ${tone.icon}`}><Icon size={18} /></span>
          </div>
          <p className="mt-2 text-sm leading-5 text-[#6f7d74]">{note}</p>
        </div>
      </div>;
    })}</div>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-3xl border border-[#e1e5de] bg-linear-to-br from-white to-[#fafcf9] p-4 shadow-[0_12px_32px_rgba(30,38,33,0.04)] transition-shadow hover:shadow-[0_18px_42px_rgba(30,38,33,0.08)] sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-[#173b2a]">Assessment status</h2><p className="mt-1 text-sm text-[#69776e]">Tap or hover for details</p></div><span className="shrink-0 rounded-full bg-[#edf4ee] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#3e6b52]">Live</span></div><DonutChart entries={statusEntries} /></section>
      <section className="rounded-3xl border border-[#e1e5de] bg-linear-to-br from-white to-[#fafcf9] p-4 shadow-[0_12px_32px_rgba(30,38,33,0.04)] transition-shadow hover:shadow-[0_18px_42px_rgba(30,38,33,0.08)] sm:p-6"><div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-[#173b2a]">Certifications</h2><p className="mt-1 text-sm text-[#69776e]">Tap or hover to compare</p></div><span className="shrink-0 rounded-full bg-[#f7f0e4] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#9a6b28]">Targets</span></div><CertificationBarChart entries={certificationEntries} /></section>
    </div>
    <div className="mt-5 grid gap-5">
      <section className="rounded-3xl border border-[#e1e5de] bg-white p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold text-[#173b2a]">Recent assessments</h2><p className="mt-1 text-sm text-[#69776e]">Latest client submissions</p></div><Link href="/admin/assessments" className="rounded-lg p-2 text-[#3e6b52] transition hover:bg-[#edf4ee]"><ArrowRight size={20} /></Link></div><div className="divide-y divide-[#edf0eb]">{data.recent_assessments.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="truncate text-base font-semibold text-[#2c3730]">{item.name}</p><p className="mt-1 truncate text-sm text-[#78857d]">{item.owner?.email}</p></div><div className="shrink-0 [&>span]:px-2.5 [&>span]:py-1.5 [&>span]:text-xs sm:[&>span]:px-3"><StatusBadge value={item.assessment_status} /></div></div>)}</div></section>
    </div>
  </>;
}
