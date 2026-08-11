import type { Attachment } from "@/lib/mockChat/types";

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Download an attachment.
 *
 * Real attachments come from the API with a proxied `downloadUrl` (e.g.
 * `/be-api/media/{filename}/download`). We fetch it so the Next.js proxy adds
 * the session token server-side, then stream the bytes to the browser. This
 * works for every kind (image/pdf/spreadsheet) because the browser trusts the
 * blob URL and the server-set filename.
 *
 * Mock attachments (no URL) fall back to synthesizing a small blob so the
 * interaction remains fully testable without a backend.
 */
export async function downloadAttachment(att: Attachment) {
  const url = att.downloadUrl ?? att.url;

  if (url) {
    // Local blob URLs (used as a preview fallback when the server returned no
    // URL) can't be fetched — trigger the download directly.
    if (url.startsWith("blob:")) {
      triggerDownload(url, att.filename);
      return;
    }

    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      // Prefer the original filename; fall back to the attachment filename.
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      const filename =
        (match && match[1] ? decodeURIComponent(match[1]) : "") || att.filename;
      triggerDownload(objectUrl, filename);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      return;
    } catch (error) {
      console.error("Attachment download failed:", error);
      // Fall through to the mock/blob path only if there is no URL; otherwise
      // rethrow so the UI can surface the error.
      if (url === att.downloadUrl || url === att.url) {
        throw error;
      }
    }
  }

  // ── Mock fallback (no URL) ───────────────────────────────────────────────
  let content: BlobPart = "";
  const type = att.kind === "spreadsheet" ? "text/csv" : "text/plain";

  if (att.kind === "spreadsheet") {
    content = [
      "Item,Category,Qty,Unit,Unit Price (RM),Total (RM)",
      "Facade glazing,Facade,1,lot,182000,182000",
      "Curtain wall system,Facade,1,lot,1240000,1240000",
      "Low-VOC paint,Finishes,1200,m2,18,21600",
      "Acoustic ceiling panels,Finishes,800,m2,95,76000",
      "Recycled steel reinforcement,Structure,42,tonne,3800,159600",
    ].join("\n");
  } else {
    content = `${att.filename}\n\nMock download — this placeholder will be replaced by the real file stream in production.\n\nSize: ${att.size} bytes\nType: ${att.mimeType}`;
  }

  const blob = new Blob([content], { type });
  const blobUrl = URL.createObjectURL(blob);
  const downloadName =
    att.filename.replace(/\.[^.]+$/, "") +
    (att.kind === "spreadsheet" ? ".csv" : ".txt");
  triggerDownload(blobUrl, downloadName);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
}