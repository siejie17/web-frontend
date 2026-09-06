"use client";

import { LoaderCircle, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Facilitator = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
};

type Assignment = {
  id: number;
  user_id: number;
  facilitator?: Facilitator;
};

type AccessData = {
  facilitators: Facilitator[];
  assignments: Assignment[];
};

export default function FacilitatorAccessPanel({ projectId }: { projectId: number }) {
  const [data, setData] = useState<AccessData | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`/be-api/projects/${projectId}/facilitators`, { credentials: "include" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || "Unable to load facilitator access.");
      setData(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load facilitator access.");
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const available = useMemo(() => {
    const assignedIds = new Set(data?.assignments.map((assignment) => assignment.user_id) || []);
    return data?.facilitators.filter((facilitator) => !assignedIds.has(facilitator.id)) || [];
  }, [data]);

  const appoint = async () => {
    if (!selectedId || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/be-api/projects/${projectId}/facilitators`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(selectedId) }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || "Unable to appoint facilitator.");
      setSelectedId("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to appoint facilitator.");
    } finally { setBusy(false); }
  };

  const revoke = async (assignment: Assignment) => {
    const name = assignment.facilitator
      ? `${assignment.facilitator.first_name} ${assignment.facilitator.last_name}`
      : "this facilitator";
    if (!window.confirm(`Revoke ${name}'s access to this project?`)) return;

    setBusy(true); setError("");
    try {
      const response = await fetch(`/be-api/projects/${projectId}/facilitators/${assignment.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || "Unable to revoke facilitator access.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to revoke facilitator access.");
    } finally { setBusy(false); }
  };

  return <section className="mb-5 rounded-3xl border border-[#dce4dd] bg-white/82 p-5 shadow-[0_8px_26px_rgba(30,38,33,0.05)] backdrop-blur-sm sm:p-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf2ec] text-[#3e6b52]"><ShieldCheck size={18} /></span>
        <div><h2 className="text-sm font-bold text-[#26332b]">Facilitator access</h2><p className="mt-1 max-w-xl text-xs leading-5 text-[#718078]">Appoint a Facilitator Admin to independently verify or certify this specific project. They cannot access your other projects.</p></div>
      </div>
      {!!data?.assignments.length && <span className="w-fit rounded-full bg-[#edf4ee] px-3 py-1 text-[10px] font-semibold text-[#3e6b52]">{data.assignments.length} active</span>}
    </div>

    {error && <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-3 text-xs text-red-700">{error}</p>}

    {!data && !error ? <div className="mt-5 flex items-center gap-2 text-xs text-[#76837b]"><LoaderCircle size={15} className="animate-spin" />Loading facilitator access…</div> : data && <>
      {!!data.assignments.length && <div className="mt-5 space-y-2">{data.assignments.map((assignment) => <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e1e7e1] bg-[#f8faf7] px-4 py-3">
        <div className="min-w-0"><p className="truncate text-xs font-semibold text-[#2d3a32]">{assignment.facilitator?.first_name} {assignment.facilitator?.last_name}</p><p className="mt-0.5 truncate text-[11px] text-[#7b8780]">{assignment.facilitator?.email}</p></div>
        <button type="button" disabled={busy} onClick={() => void revoke(assignment)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"><UserMinus size={14} />Revoke</button>
      </div>)}</div>}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={busy || available.length === 0} className="min-w-0 flex-1 rounded-xl border border-[#dfe4dc] bg-white px-3.5 py-2.5 text-sm text-[#1e2621] outline-none transition focus:border-[#3e6b52] focus:ring-3 focus:ring-[#3e6b52]/10 disabled:bg-[#f4f5f2] disabled:text-[#929b95]">
          <option value="">{available.length ? "Select a Facilitator Admin" : "No additional facilitators available"}</option>
          {available.map((facilitator) => <option key={facilitator.id} value={facilitator.id}>{facilitator.first_name} {facilitator.last_name} · {facilitator.email}</option>)}
        </select>
        <button type="button" disabled={!selectedId || busy} onClick={() => void appoint()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3e6b52] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#315b45] disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <UserPlus size={15} />}Appoint</button>
      </div>

      {data.facilitators.length === 0 && <p className="mt-3 text-[11px] text-[#849089]">No Facilitator Admin accounts exist yet. An Admin must promote an eligible user first.</p>}
    </>}
  </section>;
}
