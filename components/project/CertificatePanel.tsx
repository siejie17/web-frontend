"use client";

import { BadgeCheck, Download, ExternalLink, ShieldAlert } from "lucide-react";
import Link from "next/link";

export type IssuedCertificate = {
  certificate_number: string;
  verification_code: string;
  certification_level: string;
  approved_actual_score: number;
  maximum_score: number;
  status: "issued" | "revoked" | "superseded";
  project_name?: string | null;
  owner_name?: string | null;
  issued_at?: string | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
};

export default function CertificatePanel({
  certificate,
  projectId,
}: {
  certificate?: IssuedCertificate | null;
  projectId: number;
}) {
  if (!certificate) return null;
  const active = certificate.status === "issued";
  const issuedAt = certificate.issued_at
    ? new Intl.DateTimeFormat("en-MY", { dateStyle: "long" }).format(new Date(certificate.issued_at))
    : "Not recorded";

  return (
    <section className={`mb-6 border-y px-1 py-5 sm:px-2 ${active ? "border-[#cbdccf]" : "border-[#e4c9c3]"}`} aria-labelledby="certificate-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${active ? "bg-[#e7f1e9] text-[#315b45]" : "bg-[#f8e9e6] text-[#a3453b]"}`}>
            {active ? <BadgeCheck size={22} /> : <ShieldAlert size={22} />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase text-[#7b877f]">Final certification</p>
            <h2 id="certificate-title" className="mt-1 text-xl font-bold text-[#203229]">{certificate.certification_level}</h2>
            <p className="mt-1 text-xs text-[#66736b]">
              {certificate.approved_actual_score}/{certificate.maximum_score} points | {certificate.certificate_number} | Issued {issuedAt}
            </p>
            {!active && <p className="mt-2 text-xs font-semibold text-[#a3453b]">Revoked: {certificate.revocation_reason || "The certified assessment changed."}</p>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`/certificates/verify/${certificate.verification_code}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#ced8d1] px-3.5 text-xs font-semibold text-[#315b45] transition hover:border-[#8fa99a]" title="Verify certificate">
            <ExternalLink size={15} /> Verify
          </Link>
          {active && <a href={`/be-api/projects/${projectId}/certificate/download`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#315b45] px-3.5 text-xs font-semibold text-white transition hover:bg-[#244735]" title="Download certificate PDF">
            <Download size={15} /> Download PDF
          </a>}
        </div>
      </div>
    </section>
  );
}
