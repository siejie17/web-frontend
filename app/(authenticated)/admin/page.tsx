"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  Search,
  ShieldCheck,
  ListChecks,
} from "lucide-react";

type ReviewStatus = "Needs review" | "In progress" | "Approved";

type ProjectReview = {
  id: number;
  name: string;
  owner: string;
  type: string;
  score: number;
  status: ReviewStatus;
  submitted: string;
};

const PROJECTS: ProjectReview[] = [
  { id: 40, name: "NRNC - Sample Project", owner: "Amir Rahman", type: "NRNC", score: 67, status: "Needs review", submitted: "12 min ago" },
  { id: 39, name: "Kuching Civic Centre", owner: "Sarah Lim", type: "NREB", score: 72, status: "In progress", submitted: "1 hr ago" },
  { id: 38, name: "Miri Community Hall", owner: "Daniel Wong", type: "RNC", score: 76, status: "Approved", submitted: "Yesterday" },
  { id: 37, name: "Samarahan Office Park", owner: "Nur Aisyah", type: "NRNC", score: 53, status: "Needs review", submitted: "Yesterday" },
];

export default function AdminPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | ReviewStatus>("All");

  const filteredProjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    return PROJECTS.filter((project) => {
      const matchesSearch = !term || `${project.name} ${project.owner} ${project.type}`.toLowerCase().includes(term);
      const matchesStatus = status === "All" || project.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [query, status]);

  return (
    <div className="mx-auto max-w-310 pb-14 pt-10">
      <section className="mb-8 flex flex-col gap-5 border-b border-[#E4E1D8] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[12px] uppercase tracking-[0.08em] text-[#7C8880]" style={{ fontFamily: "var(--font-mono)" }}>
            <ShieldCheck size={14} className="text-[#3E6B52]" />
            Assessment administration
          </div>
          <h1 className="text-[36px] font-bold leading-tight tracking-[-0.025em] sm:text-[40px]" style={{ fontFamily: "var(--font-display)" }}>
            Review workspace
          </h1>
          <p className="mt-3 max-w-155 text-[14px] leading-relaxed text-[#5B655F]">
            Review submitted assessments, verify project information, and manage approval decisions.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#CFE0D6] bg-[#EEF2EC] px-3 py-1.5 text-[12px] font-medium text-[#3E6B52]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3E6B52]" />
          Sample dashboard data
        </span>
      </section>

      <section aria-label="Platform summary" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Assigned to you" value="24" note="6 added this week" icon={<ListChecks size={18} />} tone="sage" />
        <MetricCard label="Reviewed" value="186" note="This quarter" icon={<Building2 size={18} />} tone="ink" />
        <MetricCard label="Pending review" value="18" note="4 due today" icon={<Clock3 size={18} />} tone="gold" />
        <MetricCard label="Approved" value="92%" note="Approval rate" icon={<FileCheck2 size={18} />} tone="sage" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <section className="overflow-hidden rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.04)]">
          <div className="border-b border-[#EFEDE6] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[18px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Assessment review</h2>
                <p className="mt-1 text-[12.5px] text-[#7C8880]">Recent submissions requiring administrator attention.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative block">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A938C]" />
                  <span className="sr-only">Search assessments</span>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" className="h-9.5 w-full rounded-xl border border-[#E4E1D8] bg-[#FCFCF8] pl-9 pr-3 text-[12.5px] outline-none placeholder:text-[#A5ADA7] focus:border-[#3E6B52] sm:w-45" />
                </label>
                <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as "All" | ReviewStatus)} className="h-9.5 rounded-xl border border-[#E4E1D8] bg-[#FCFCF8] px-3 text-[12.5px] text-[#5B655F] outline-none focus:border-[#3E6B52]">
                  <option>All</option><option>Needs review</option><option>In progress</option><option>Approved</option>
                </select>
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#EFEDE6]">
            {filteredProjects.length ? filteredProjects.map((project) => <ProjectRow key={project.id} project={project} />) : (
              <div className="px-6 py-12 text-center text-[13px] text-[#8A938C]">No assessments match your search.</div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-[#E4E1D8] bg-white p-6 shadow-[0_8px_24px_rgba(30,38,33,0.04)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Review queue</h2>
                <p className="mt-1 text-[12px] text-[#8A938C]">Today&apos;s workload</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2EC] text-[#3E6B52]"><ListChecks size={17} /></span>
            </div>
            <div className="space-y-3 text-[12.5px]">
              <QueueItem label="Due today" value="4" tone="text-[#B4483C]" />
              <QueueItem label="Due this week" value="11" tone="text-[#C08A3E]" />
              <QueueItem label="Unassigned" value="3" tone="text-[#5B655F]" />
            </div>
          </section>

          <section className="relative overflow-hidden rounded-3xl bg-[#3E6B52] p-6 text-[#F6F6F2] shadow-[0_14px_30px_rgba(62,107,82,0.22)]">
            <BlueprintGrid />
            <div className="relative">
              <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><ShieldCheck size={19} /></span>
              <p className="text-[12px] uppercase tracking-[0.08em] text-white/60" style={{ fontFamily: "var(--font-mono)" }}>Your authority</p>
              <p className="mt-2 text-[27px] font-bold" style={{ fontFamily: "var(--font-display)" }}>Assessment admin</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-white/70">Review and approve assessments. User roles, administrator accounts, and system settings remain restricted.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function QueueItem({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="flex items-center justify-between rounded-xl bg-[#F6F6F2] px-3.5 py-3"><span className="text-[#5B655F]">{label}</span><span className={`font-semibold ${tone}`}>{value}</span></div>;
}

function MetricCard({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: React.ReactNode; tone: "sage" | "ink" | "gold" }) {
  const tones = { sage: "bg-[#EEF2EC] text-[#3E6B52]", ink: "bg-[#F0F1EF] text-[#1E2621]", gold: "bg-[#FBF3E7] text-[#C08A3E]" };
  return <article className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-[0_6px_18px_rgba(30,38,33,0.035)]">
    <div className="mb-5 flex items-start justify-between"><p className="text-[12.5px] font-medium text-[#5B655F]">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span></div>
    <p className="text-[28px] font-bold tracking-[-0.025em]" style={{ fontFamily: "var(--font-display)" }}>{value}</p>
    <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-[#8A938C]"><CheckCircle2 size={12} className="text-[#3E6B52]" />{note}</p>
  </article>;
}

function ProjectRow({ project }: { project: ProjectReview }) {
  const statusTone = project.status === "Approved" ? "bg-[#EEF2EC] text-[#3E6B52]" : project.status === "In progress" ? "bg-[#FBF3E7] text-[#9A6B21]" : "bg-[#FBEDEB] text-[#9A443A]";
  const scoreTone = project.score >= 60 ? "text-[#3E6B52]" : "text-[#C08A3E]";
  return <Link href={`/projects/${project.id}`} className="group grid gap-4 px-5 py-4 transition-colors hover:bg-[#FCFCF8] sm:grid-cols-[minmax(0,1fr)_90px_110px_18px] sm:items-center sm:px-6">
    <div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-[13.5px] font-semibold">{project.name}</span><span className="rounded-md bg-[#F0F1EF] px-1.5 py-0.5 text-[10px] font-semibold text-[#5B655F]">{project.type}</span></div><p className="mt-1 text-[11.5px] text-[#8A938C]">{project.owner} · {project.submitted}</p></div>
    <div><p className="text-[10px] uppercase tracking-wide text-[#A0A8A2]">Score</p><p className={`mt-0.5 text-[14px] font-semibold ${scoreTone}`}>{project.score}/100</p></div>
    <span className={`w-fit rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${statusTone}`}>{project.status}</span>
    <ChevronRight size={16} className="hidden text-[#A0A8A2] transition-transform group-hover:translate-x-0.5 sm:block" />
  </Link>;
}

function BlueprintGrid() {
  return <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.1]" aria-hidden="true"><defs><pattern id="admin-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#F6F6F2" strokeWidth="0.75" /></pattern></defs><rect width="100%" height="100%" fill="url(#admin-grid)" /></svg>;
}
