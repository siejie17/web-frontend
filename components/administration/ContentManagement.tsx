"use client";

import { Award, BookOpen, ExternalLink, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { administrationApi } from "@/lib/administrationApi";
import { ErrorState, inputClass, LoadingState, PageHeading, primaryButton, secondaryButton, StatusBadge } from "./AdminUI";

type ReferenceItem = { id: number; title: string; description?: string; category?: string; file_url?: string };
type RecommendationItem = { id: number; certification_level: string; title: string; content: string; is_active: boolean };
type RecommendationSection = { id: number; certification_level: string; title: string };
type RecommendationPayload = { sections: RecommendationSection[]; recommendations: RecommendationItem[] };
type FormMode = "reference" | "section-title" | "guidance";

const CERTIFICATION_TIERS = [
  { level: "Platinum", range: "86–100 points", accent: "bg-[#29483a]", soft: "bg-[#edf3ef]", text: "text-[#29483a]", border: "border-[#cddbd2]" },
  { level: "Gold", range: "76–85 points", accent: "bg-[#c08a3e]", soft: "bg-[#fbf4e8]", text: "text-[#946521]", border: "border-[#ead7b6]" },
  { level: "Silver", range: "66–75 points", accent: "bg-[#84929a]", soft: "bg-[#f0f3f4]", text: "text-[#5f6d75]", border: "border-[#d5dde0]" },
  { level: "Certified", range: "50–65 points", accent: "bg-[#548066]", soft: "bg-[#eef5f0]", text: "text-[#3e6b52]", border: "border-[#d2e2d6]" },
  { level: "Not Certified", range: "Below 50 points", accent: "bg-[#a9685b]", soft: "bg-[#faf0ed]", text: "text-[#8d5146]", border: "border-[#e8d1cb]" },
] as const;

type Tier = (typeof CERTIFICATION_TIERS)[number];

export default function ContentManagement({ type }: { type: "references" | "recommendations" }) {
  const isReference = type === "references";
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [sections, setSections] = useState<RecommendationSection[]>([]);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(isReference ? "reference" : "guidance");
  const [editing, setEditing] = useState<ReferenceItem | RecommendationItem | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean | number | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (isReference) {
        setReferences(await administrationApi<ReferenceItem[]>("admin/references"));
      } else {
        const result = await administrationApi<RecommendationPayload>("admin/recommendations");
        setSections(result.sections);
        setRecommendations(result.recommendations);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load content.");
    } finally {
      setLoading(false);
    }
  }, [isReference]);

  useEffect(() => { void load(); }, [load]);

  const sectionTitle = (tier: Tier) => sections.find(
    (section) => section.certification_level.toLowerCase() === tier.level.toLowerCase(),
  )?.title || tier.level;

  const tierGuidance = (tier: Tier) => recommendations.filter(
    (item) => item.certification_level.toLowerCase() === tier.level.toLowerCase(),
  );

  const showReferenceForm = (item?: ReferenceItem) => {
    setFormMode("reference");
    setEditing(item || null);
    setDocumentFile(null);
    setForm(item ? { ...item } : { title: "", description: "", category: "", file_url: "" });
    setFormOpen(true);
  };

  const showTitleForm = (tier: Tier) => {
    setFormMode("section-title");
    setEditing(null);
    setForm({ certification_level: tier.level, title: sectionTitle(tier) });
    setFormOpen(true);
  };

  const showGuidanceForm = (tier: Tier, item?: RecommendationItem) => {
    setFormMode("guidance");
    setEditing(item || null);
    setForm(item ? { ...item } : {
      certification_level: tier.level,
      title: "",
      content: "",
      is_active: true,
    });
    setFormOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      if (formMode === "section-title") {
        await administrationApi("admin/recommendation-section", {
          method: "PATCH",
          body: JSON.stringify(form),
        });
      } else {
        let payload = { ...form };
        if (formMode === "reference" && documentFile) {
          const upload = await fetch("/be-api/administration/admin/references/upload", {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": documentFile.type || "application/octet-stream",
              "X-File-Name": encodeURIComponent(documentFile.name),
            },
            body: documentFile,
          });
          const uploaded = await upload.json().catch(() => null);
          if (!upload.ok) throw new Error(uploaded?.message || "Unable to upload document.");
          payload = { ...payload, file_url: uploaded.file_url };
        }

        const resource = formMode === "reference" ? "references" : "recommendations";
        const path = editing ? `admin/${resource}/${editing.id}` : `admin/${resource}`;
        await administrationApi(path, {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        });
      }

      setFormOpen(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  };

  const removeReference = async (item: ReferenceItem) => {
    if (!window.confirm("Delete this reference? This cannot be undone.")) return;
    try {
      await administrationApi(`admin/references/${item.id}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete reference.");
    }
  };

  const removeGuidance = async (item: RecommendationItem) => {
    if (!window.confirm(`Delete “${item.title}”? This guidance cannot be recovered.`)) return;
    setBusy(true);
    setError("");
    try {
      await administrationApi(`admin/recommendations/${item.id}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete guidance.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="Managed administrative content"
        title={isReference ? "Reference library" : "Certification Recommendations"}
        description={isReference
          ? "Maintain standards, manuals, certification guidance, and supporting links for administrative work."
          : "Open a certification section to view and manage every guidance entry recorded within it."}
        action={isReference ? <button onClick={() => showReferenceForm()} className={`${primaryButton} gap-2`}><Plus size={16} />Add reference</button> : undefined}
      />

      {!isReference && (
        <section className="mb-6 overflow-hidden rounded-3xl border border-[#47795e] bg-linear-to-r from-[#2f6849] to-[#4f8566] px-6 py-6 text-white shadow-[0_14px_32px_rgba(36,82,57,0.16)] sm:px-7">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/90 ring-1 ring-white/20"><Sparkles size={20} /></span>
            <div><h2 className="text-base font-bold">Guidance by certification outcome</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-white/90">Select Platinum, Gold, Silver, Certified, or Not Certified to see all guidance saved in that section.</p></div>
          </div>
        </section>
      )}

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {loading ? <LoadingState /> : isReference ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {references.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#e1e5de] bg-white p-5">
              <div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf1eb] text-[#3e6b52]"><BookOpen size={18} /></span><span className="rounded-full bg-[#f3f5f1] px-2.5 py-1 text-xs text-[#6d796f]">{item.category || "General"}</span></div>
              <h2 className="mt-5 text-base font-bold text-[#27332c]">{item.title}</h2>
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-[#68756d]">{item.description || "No description"}</p>
              <div className="mt-5 flex items-center justify-between border-t border-[#edf0eb] pt-4"><button onClick={() => showReferenceForm(item)} className="text-sm font-semibold text-[#3e6b52]">Edit details</button><div className="flex gap-2">{item.file_url && <a href={item.file_url} target="_blank" rel="noreferrer" className="text-[#6d796f]"><ExternalLink size={16} /></a>}<button onClick={() => removeReference(item)} className="text-red-500"><Trash2 size={16} /></button></div></div>
            </article>
          ))}
          {references.length === 0 && <EmptyState text="Nothing has been added yet." />}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {CERTIFICATION_TIERS.map((tier) => {
            const guidance = tierGuidance(tier);
            return (
              <article
                key={tier.level}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTier(tier)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedTier(tier); }}
                className={`group flex min-h-72 cursor-pointer flex-col overflow-hidden rounded-3xl border bg-white shadow-[0_10px_28px_rgba(30,38,33,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(30,38,33,0.1)] ${tier.border}`}
              >
                <div className={`h-1.5 ${tier.accent}`} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tier.soft} ${tier.text}`}><Award size={20} /></span><span className="rounded-full border border-[#e5e9e4] bg-[#f7f8f6] px-2.5 py-1 text-xs font-semibold text-[#69766e]">{guidance.length} {guidance.length === 1 ? "entry" : "entries"}</span></div>
                  <p className={`mt-5 text-xs font-bold uppercase tracking-[0.16em] ${tier.text}`}>{tier.level} · {tier.range}</p>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold leading-6 text-[#27332c]">{sectionTitle(tier)}</h2>
                    <button onClick={(event) => { event.stopPropagation(); showTitleForm(tier); }} aria-label={`Edit ${sectionTitle(tier)} title`} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current/10 ${tier.soft} ${tier.text} transition hover:brightness-95`}><Pencil size={13} /></button>
                  </div>
                  <div className="mt-4 min-h-19 space-y-2">
                    {guidance.slice(0, 2).map((item) => <div key={item.id} className="flex items-center gap-2 text-sm text-[#65736a]"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tier.accent}`} /><span className="truncate">{item.title}</span></div>)}
                    {guidance.length > 2 && <p className="pl-3.5 text-sm font-medium text-[#8a948e]">+{guidance.length - 2} more guidance {guidance.length - 2 === 1 ? "entry" : "entries"}</p>}
                    {guidance.length === 0 && <p className="text-sm leading-6 text-[#89938d]">No guidance recorded yet.</p>}
                  </div>
                  <div className={`mt-auto flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ${tier.soft} ${tier.text} transition group-hover:brightness-95`}><span>Open guidance</span><BookOpen size={16} /></div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedTier && (
        <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="scrollbar-hidden max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
            <div className="sticky -top-6 z-10 -mx-6 -mt-6 flex items-center justify-between border-b border-[#edf0eb] bg-white/95 px-6 py-5 backdrop-blur sm:-top-8 sm:-mx-8 sm:-mt-8 sm:px-8">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a877f]">{selectedTier.level} · {selectedTier.range}</p><h2 className="mt-1 text-xl font-bold text-[#173b2a]">{sectionTitle(selectedTier)}</h2></div>
              <button onClick={() => setSelectedTier(null)} className="rounded-full bg-[#f1f3ef] p-2" aria-label="Close guidance"><X size={17} /></button>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4"><div><h3 className="text-base font-bold text-[#27332c]">Recorded guidance</h3><p className="mt-1 text-sm text-[#78837b]">{tierGuidance(selectedTier).length} entries in this section</p></div><button onClick={() => showGuidanceForm(selectedTier)} className={`${primaryButton} gap-2`}><Plus size={15} />Add guidance</button></div>
            <div className="mt-5 space-y-3">
              {tierGuidance(selectedTier).map((item) => (
                <article key={item.id} className="rounded-2xl border border-[#e1e5de] bg-[#fbfcfa] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-[#2b3830]">{item.title}</h4><StatusBadge value={item.is_active ? "active" : "disabled"} /></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#65736a]">{item.content || "No guidance content yet."}</p></div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => showGuidanceForm(selectedTier, item)} className={`${secondaryButton} gap-2`}><Pencil size={14} />Edit</button>
                      <button disabled={busy} onClick={() => removeGuidance(item)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"><Trash2 size={14} />Delete</button>
                    </div>
                  </div>
                </article>
              ))}
              {tierGuidance(selectedTier).length === 0 && <EmptyState text="No guidance has been recorded in this section yet." />}
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-70 flex items-end justify-center bg-black/35 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-xl rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
            <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold text-[#173b2a]">{formMode === "section-title" ? "Edit section title" : formMode === "guidance" ? `${editing ? "Edit" : "Add"} guidance` : `${editing ? "Edit" : "Add"} reference`}</h2><button onClick={() => setFormOpen(false)} className="rounded-full bg-[#f1f3ef] p-2"><X size={17} /></button></div>
            <div className="space-y-4">
              {formMode === "section-title" && <label className="block text-sm font-semibold text-[#59675e]">Section title<input className={`${inputClass} mt-2`} value={String(form.title || "")} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Example: Platinum Guidance" /></label>}
              {formMode === "guidance" && <><label className="block text-sm font-semibold text-[#59675e]">Guidance title<input className={`${inputClass} mt-2`} value={String(form.title || "")} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Example: Energy performance priorities" /></label><label className="block text-sm font-semibold text-[#59675e]">Guidance content<textarea className={`${inputClass} mt-2 min-h-36 resize-y`} value={String(form.content || "")} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Write the guidance shown within this certification section" /></label><label className="flex items-center gap-2 text-sm text-[#59675e]"><input type="checkbox" checked={Boolean(form.is_active)} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />Active guidance</label></>}
              {formMode === "reference" && <><label className="block text-sm font-semibold text-[#59675e]">Title<input className={`${inputClass} mt-2`} value={String(form.title || "")} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label className="block text-sm font-semibold text-[#59675e]">Category<input className={`${inputClass} mt-2`} value={String(form.category || "")} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Guideline, standard, manual…" /></label><label className="block text-sm font-semibold text-[#59675e]">Description<textarea className={`${inputClass} mt-2 min-h-32 resize-y`} value={String(form.description || "")} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label className="block text-sm font-semibold text-[#59675e]">Upload document<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-dashed border-[#cfd8d0] bg-[#f8faf7] px-3.5 py-3 text-sm text-[#65736a] file:mr-3 file:rounded-lg file:border-0 file:bg-[#e8f1ea] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#3e6b52]" />{documentFile && <span className="mt-1.5 block font-normal text-[#7b8780]">{documentFile.name} · {(documentFile.size / 1024 / 1024).toFixed(1)} MB</span>}</label><label className="block text-sm font-semibold text-[#59675e]">Document URL <span className="font-normal text-[#8a948e]">(optional)</span><input className={`${inputClass} mt-2`} value={String(form.file_url || "")} onChange={(event) => setForm({ ...form, file_url: event.target.value })} placeholder="https://…" /></label></>}
            </div>
            <div className="mt-7 flex justify-end gap-3"><button onClick={() => setFormOpen(false)} className={secondaryButton}>Cancel</button><button disabled={busy} onClick={save} className={primaryButton}>{busy ? "Saving…" : "Save"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-[#ced7cf] bg-white p-10 text-center text-sm text-[#77827b]">{text}</div>;
}
