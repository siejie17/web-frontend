"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { administrationApi, Paginated } from "@/lib/administrationApi";
import { ErrorState, inputClass, LoadingState, PageHeading, StatusBadge } from "./AdminUI";

type Log = { id: number; action: string; system_role?: string; target_label?: string; status: string; created_at: string; user?: { first_name: string; last_name: string; email: string } };

export default function ActivityLogs() {
  const [logs, setLogs] = useState<Log[]>([]); const [q, setQ] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(() => { setLoading(true); administrationApi<Paginated<Log>>(`super-admin/activity-logs?q=${encodeURIComponent(q)}`).then((r) => setLogs(r.data)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [q]);
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [load]);
  return <><PageHeading eyebrow="Integrity and oversight" title="Activity logs" description="A read-only history of sign-ins, role changes, appointments, reviews, and administrative content changes." /><label className="relative mb-5 block max-w-xl"><Search className="absolute left-3.5 top-3 text-[#819087]" size={17} /><input className={`${inputClass} pl-10`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action or target" /></label>{error && <ErrorState message={error} />}{loading ? <LoadingState /> : <div className="space-y-3">{logs.map((log) => <article key={log.id} className="grid gap-3 rounded-2xl border border-[#e1e5de] bg-white p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="text-base font-bold capitalize text-[#27332c]">{log.action.replaceAll("_", " ")}</p><StatusBadge value={log.status} /></div><p className="mt-1 text-sm text-[#68756d]">{log.user ? `${log.user.first_name} ${log.user.last_name} · ${log.user.email}` : "System"}{log.target_label ? ` → ${log.target_label}` : ""}</p></div><time className="text-sm text-[#7a867e]">{new Date(log.created_at).toLocaleString()}</time></article>)}{logs.length === 0 && <p className="rounded-2xl bg-white p-10 text-center text-sm text-[#7b8780]">No activity recorded yet.</p>}</div>}</>;
}
