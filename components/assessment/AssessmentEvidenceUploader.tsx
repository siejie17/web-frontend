"use client";

import { ExternalLink, FileUp, LoaderCircle, MessageSquare, Paperclip, Trash2 } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import EvidenceRemovalDialog from "./EvidenceRemovalDialog";

const MAX_EVIDENCE_FILES = 5;

export type AssessmentEvidenceFile = {
  id: string;
  item_id: string;
  uploaded_by?: string;
  original_name: string;
  filename: string;
  kind: string;
  size: number;
  uploaded_at?: string | null;
};

export type AssessmentItemFeedback = {
  item_id: string;
  remarks: string;
  reviewed_at?: string | null;
  reviewed_by?: { first_name?: string; last_name?: string } | null;
};

export default function AssessmentEvidenceUploader({
  projectId,
  itemId,
  files,
  feedback,
  readOnly = false,
  disabledReason,
  onUploaded,
  onRemoved,
}: {
  projectId: string | number;
  itemId: string | number;
  files: AssessmentEvidenceFile[];
  feedback?: AssessmentItemFeedback;
  readOnly?: boolean;
  disabledReason?: string;
  onUploaded: (file: AssessmentEvidenceFile) => void;
  onRemoved: (fileId: string) => void;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<AssessmentEvidenceFile | null>(null);
  const [error, setError] = useState("");

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading) return;

    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("assessment_item_id", String(itemId));
      const response = await fetch(`/be-api/projects/${projectId}/attachments`, {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Unable to upload evidence.");
      const uploaded = data?.data ?? data;

      onUploaded({
        id: String(uploaded.id),
        item_id: String(uploaded.assessmentItemId ?? itemId),
        uploaded_by: String(uploaded.uploadedBy ?? user?.id ?? ""),
        original_name: uploaded.originalName ?? uploaded.filename ?? file.name,
        filename: uploaded.storedFilename,
        kind: uploaded.kind,
        size: Number(uploaded.size ?? file.size),
        uploaded_at: uploaded.uploadedAt ?? new Date().toISOString(),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to upload evidence.");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (file: AssessmentEvidenceFile) => {
    if (removingId) return;
    setRemovingId(file.id);
    setError("");
    try {
      const response = await fetch(`/be-api/projects/${projectId}/attachments/${file.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Unable to remove evidence.");
      onRemoved(file.id);
      setPendingRemoval(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to remove evidence.");
    } finally {
      setRemovingId(null);
    }
  };

  const limitReached = files.length >= MAX_EVIDENCE_FILES;

  return (
    <div className="mt-3 rounded-2xl border border-dashed border-[#C9D7CE] bg-[#F8FAF8] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#496554]">
            <Paperclip size={12} /> Evidence for Actual review
          </p>
          <p className="mt-1 text-[10.5px] text-[#718078]">The administrator uses this evidence to decide the Actual selection.</p>
        </div>
        {!readOnly && (
          <>
            <input ref={inputRef} type="file" className="hidden" accept=".png,.jpg,.jpeg,.webp,.pdf,.xlsx" onChange={upload} />
            <button type="button" disabled={uploading || limitReached} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-[#BFD1C4] bg-white px-3 py-2 text-[11px] font-semibold text-[#356247] transition hover:border-[#7FA18B] disabled:cursor-not-allowed disabled:opacity-60">
              {uploading ? <LoaderCircle size={13} className="animate-spin" /> : <FileUp size={13} />}
              {uploading ? "Uploading…" : limitReached ? "Limit reached" : "Add evidence"}
            </button>
          </>
        )}
      </div>

      {readOnly && disabledReason && (
        <p className="mt-3 rounded-xl border border-[#E8D6B3] bg-[#FFF9ED] px-3 py-2.5 text-[10.5px] leading-5 text-[#765B2D]">{disabledReason}</p>
      )}

      {feedback?.remarks && (
        <div className="mt-3 rounded-xl border border-[#E8D6B3] bg-[#FFF9ED] px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A6420]"><MessageSquare size={12} /> Admin remark</p>
          <p className="mt-1.5 whitespace-pre-wrap text-[11.5px] leading-5 text-[#665332]">{feedback.remarks}</p>
          {(feedback.reviewed_by || feedback.reviewed_at) && (
            <p className="mt-2 text-[9.5px] text-[#9A8359]">
              {feedback.reviewed_by ? `${feedback.reviewed_by.first_name || ""} ${feedback.reviewed_by.last_name || ""}`.trim() : "Administrator"}
              {feedback.reviewed_at ? ` · ${new Date(feedback.reviewed_at).toLocaleString()}` : ""}
            </p>
          )}
        </div>
      )}

      {files.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {files.map((file) => {
            const canRemove = !readOnly && String(file.uploaded_by) === String(user?.id);
            return <div key={file.id} className="flex items-center gap-1.5">
              <a href={`/be-api/media/${encodeURIComponent(file.filename)}`} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-[#DFE7E1] bg-white px-3 py-2 text-[11px] text-[#3E6B52] transition hover:border-[#9DB6A5]">
                <span className="min-w-0 truncate">{file.original_name}</span>
                <ExternalLink size={12} className="shrink-0" />
              </a>
              {canRemove && <button type="button" disabled={removingId === file.id} onClick={() => setPendingRemoval(file)} aria-label={`Remove ${file.original_name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50">
                {removingId === file.id ? <LoaderCircle size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>}
            </div>;
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-[10.5px] text-[#8A958E]">No evidence added yet.</p>
      )}
      <p className="mt-2 text-right text-[9.5px] text-[#929D96]">{files.length}/{MAX_EVIDENCE_FILES} evidence files</p>
      {error && <p className="mt-2 text-[10.5px] font-medium text-red-600">{error}</p>}
      {pendingRemoval && <EvidenceRemovalDialog fileName={pendingRemoval.original_name} busy={removingId === pendingRemoval.id} onCancel={() => setPendingRemoval(null)} onConfirm={() => remove(pendingRemoval)} />}
    </div>
  );
}
