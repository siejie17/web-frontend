"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronRight,
  Crown,
  KeyRound,
  Search,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";

type AccountStatus = "Active" | "Invited" | "Suspended";
type AdminAccount = { name: string; email: string; role: "SuperAdmin" | "Admin"; status: AccountStatus; initials: string; activity: string };

const ADMINS: AdminAccount[] = [
  { name: "Alicia Tan", email: "alicia@proformax.my", role: "SuperAdmin", status: "Active", initials: "AT", activity: "Now" },
  { name: "Farid Hakim", email: "farid@proformax.my", role: "Admin", status: "Active", initials: "FH", activity: "18 min ago" },
  { name: "Melinda Lee", email: "melinda@proformax.my", role: "Admin", status: "Invited", initials: "ML", activity: "Invite sent today" },
  { name: "Joseph Ting", email: "joseph@proformax.my", role: "Admin", status: "Suspended", initials: "JT", activity: "8 days ago" },
];

export default function SuperAdminPage() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return ADMINS.filter((admin) => !term || `${admin.name} ${admin.email} ${admin.role}`.toLowerCase().includes(term));
  }, [query]);

  return (
    <div className="mx-auto max-w-310 pb-14 pt-10">
      <section className="mb-8 flex flex-col gap-5 border-b border-[#E4E1D8] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[12px] uppercase tracking-[0.08em] text-[#7C8880]" style={{ fontFamily: "var(--font-mono)" }}>
            <Crown size={14} className="text-[#C08A3E]" /> Super administration
          </div>
          <h1 className="text-[36px] font-bold leading-tight tracking-[-0.025em] sm:text-[40px]" style={{ fontFamily: "var(--font-display)" }}>Platform control centre</h1>
          <p className="mt-3 max-w-165 text-[14px] leading-relaxed text-[#5B655F]">Manage administrator access, oversee users, and monitor the entire ProFormaX platform.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#EBD8B8] bg-[#FBF3E7] px-3 py-1.5 text-[12px] font-medium text-[#95691F]"><KeyRound size={13} /> Highest authority</span>
      </section>

      <section aria-label="Platform summary" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Registered users" value="248" note="12 joined this month" icon={<Users size={18} />} tone="sage" />
        <Metric label="Administrators" value="4" note="2 roles configured" icon={<UserCog size={18} />} tone="gold" />
        <Metric label="All assessments" value="1,284" note="104 this month" icon={<Building2 size={18} />} tone="ink" />
        <Metric label="System availability" value="99.9%" note="All services operational" icon={<Activity size={18} />} tone="sage" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(290px,0.8fr)]">
        <section className="overflow-hidden rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.04)]">
          <div className="flex flex-col gap-4 border-b border-[#EFEDE6] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div><h2 className="text-[18px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Administrator accounts</h2><p className="mt-1 text-[12.5px] text-[#7C8880]">Control privileged access to ProFormaX.</p></div>
            <div className="flex gap-2">
              <label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A938C]" /><span className="sr-only">Search administrators</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search admins" className="h-9.5 w-full rounded-xl border border-[#E4E1D8] bg-[#FCFCF8] pl-9 pr-3 text-[12.5px] outline-none focus:border-[#3E6B52] sm:w-42" /></label>
              <button type="button" className="inline-flex h-9.5 items-center gap-2 rounded-xl bg-[#3E6B52] px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#2E5140]"><UserPlus size={14} /> Invite</button>
            </div>
          </div>
          <div className="divide-y divide-[#EFEDE6]">
            {filtered.length ? filtered.map((admin) => <AdminRow key={admin.email} admin={admin} />) : <p className="px-6 py-12 text-center text-[13px] text-[#8A938C]">No administrators match your search.</p>}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-[#E4E1D8] bg-white p-6 shadow-[0_8px_24px_rgba(30,38,33,0.04)]">
            <h2 className="text-[16px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Authority overview</h2>
            <p className="mt-1 text-[12px] text-[#8A938C]">Role boundaries</p>
            <div className="mt-5 space-y-3">
              <Authority icon={<Crown size={15} />} title="SuperAdmin" detail="Admins, users, roles, settings" gold />
              <Authority icon={<ShieldCheck size={15} />} title="Admin" detail="Assessment review and approval" />
              <Authority icon={<Users size={15} />} title="User" detail="Own projects and assessments" />
            </div>
          </section>

          <section className="relative overflow-hidden rounded-3xl bg-[#1E2621] p-6 text-white shadow-[0_14px_30px_rgba(30,38,33,0.2)]">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full border border-white/10" /><div className="absolute -right-6 -top-6 h-24 w-24 rounded-full border border-white/10" />
            <span className="relative mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Activity size={18} /></span>
            <p className="relative text-[12px] uppercase tracking-[0.08em] text-white/50" style={{ fontFamily: "var(--font-mono)" }}>System health</p>
            <p className="relative mt-2 text-[25px] font-bold" style={{ fontFamily: "var(--font-display)" }}>All services normal</p>
            <div className="relative mt-4 space-y-2 text-[11.5px] text-white/70"><Health label="API service" /><Health label="Authentication" /><Health label="Assessment engine" /></div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: React.ReactNode; tone: "sage" | "ink" | "gold" }) {
  const tones = { sage: "bg-[#EEF2EC] text-[#3E6B52]", ink: "bg-[#F0F1EF] text-[#1E2621]", gold: "bg-[#FBF3E7] text-[#C08A3E]" };
  return <article className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-[0_6px_18px_rgba(30,38,33,0.035)]"><div className="mb-5 flex items-start justify-between"><p className="text-[12.5px] font-medium text-[#5B655F]">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span></div><p className="text-[28px] font-bold tracking-[-0.025em]" style={{ fontFamily: "var(--font-display)" }}>{value}</p><p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-[#8A938C]"><CheckCircle2 size={12} className="text-[#3E6B52]" />{note}</p></article>;
}

function AdminRow({ admin }: { admin: AdminAccount }) {
  const status = admin.status === "Active" ? "bg-[#EEF2EC] text-[#3E6B52]" : admin.status === "Invited" ? "bg-[#FBF3E7] text-[#95691F]" : "bg-[#FBEDEB] text-[#9A443A]";
  return <button type="button" className="group grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-[#FCFCF8] sm:grid-cols-[minmax(0,1fr)_100px_90px_18px] sm:items-center sm:px-6"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1E2621] text-[11px] font-semibold text-white">{admin.initials}</span><div className="min-w-0"><p className="truncate text-[13px] font-semibold">{admin.name}</p><p className="truncate text-[11.5px] text-[#8A938C]">{admin.email} · {admin.activity}</p></div></div><span className="text-[11.5px] font-medium text-[#5B655F]">{admin.role}</span><span className={`w-fit rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${status}`}>{admin.status}</span><ChevronRight size={16} className="hidden text-[#A0A8A2] transition-transform group-hover:translate-x-0.5 sm:block" /></button>;
}

function Authority({ icon, title, detail, gold }: { icon: React.ReactNode; title: string; detail: string; gold?: boolean }) {
  return <div className="flex items-center gap-3 rounded-xl bg-[#F6F6F2] p-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${gold ? "bg-[#FBF3E7] text-[#C08A3E]" : "bg-[#EEF2EC] text-[#3E6B52]"}`}>{icon}</span><div><p className="text-[12px] font-semibold">{title}</p><p className="mt-0.5 text-[10.5px] text-[#8A938C]">{detail}</p></div></div>;
}

function Health({ label }: { label: string }) { return <div className="flex items-center justify-between"><span>{label}</span><span className="flex items-center gap-1.5 text-white/80"><span className="h-1.5 w-1.5 rounded-full bg-[#72B88C]" />Operational</span></div>; }
