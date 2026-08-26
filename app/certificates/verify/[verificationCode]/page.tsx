import { BadgeCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";

type Certificate = {
  certificate_number: string;
  certification_level: string;
  approved_actual_score: number;
  maximum_score: number;
  status: string;
  project_name?: string | null;
  building_type?: string | null;
  location?: string | null;
  issued_at?: string | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
};

export default async function CertificateVerificationPage({
  params,
}: {
  params: Promise<{ verificationCode: string }>;
}) {
  const { verificationCode } = await params;
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  const response = await fetch(`${base}/certificates/verify/${encodeURIComponent(verificationCode)}`, { cache: "no-store" }).catch(() => null);
  const certificate = response?.ok ? ((await response.json()).certificate as Certificate) : null;
  const active = certificate?.status === "issued";

  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-12 text-[#203229] sm:py-20">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-[#315b45]">ProFormaX</Link>
        <div className="mt-10 border-y border-[#d9e1da] py-10">
          <span className={`flex h-14 w-14 items-center justify-center rounded-lg ${active ? "bg-[#e5f0e8] text-[#315b45]" : "bg-[#f7e7e4] text-[#a3453b]"}`}>
            {active ? <BadgeCheck size={29} /> : <ShieldAlert size={29} />}
          </span>
          <p className="mt-6 text-xs font-semibold uppercase text-[#77837b]">Certificate verification</p>
          <h1 className="mt-2 text-3xl font-bold">{certificate ? (active ? "Valid certificate" : "Certificate revoked") : "Certificate not found"}</h1>
          {certificate ? <>
            <dl className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
              <Detail label="Certificate number" value={certificate.certificate_number} />
              <Detail label="Final certification" value={certificate.certification_level} />
              <Detail label="Project" value={certificate.project_name || "Not specified"} />
              <Detail label="Approved score" value={`${certificate.approved_actual_score}/${certificate.maximum_score}`} />
              <Detail label="Building type" value={certificate.building_type || "Not specified"} />
              <Detail label="Location" value={certificate.location || "Not specified"} />
              <Detail label="Issued" value={certificate.issued_at ? new Intl.DateTimeFormat("en-MY", { dateStyle: "long" }).format(new Date(certificate.issued_at)) : "Not recorded"} />
              <Detail label="Status" value={certificate.status.toUpperCase()} />
            </dl>
            {!active && <p className="mt-7 border-l-4 border-[#b35348] pl-4 text-sm text-[#8e3f37]">{certificate.revocation_reason || "This certificate is no longer active."}</p>}
          </> : <p className="mt-5 text-sm leading-6 text-[#66736b]">The verification code does not match a certificate issued by ProFormaX.</p>}
        </div>
        <p className="mt-6 max-w-2xl text-xs leading-5 text-[#7c8780]">This page verifies a ProFormaX assessment record. It does not represent an official Green Building Index certificate unless issued under authorization from the relevant certification body.</p>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-semibold uppercase text-[#849088]">{label}</dt><dd className="mt-1 text-sm font-semibold text-[#293a31]">{value}</dd></div>;
}
