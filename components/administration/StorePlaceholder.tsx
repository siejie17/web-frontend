import { PackageOpen } from "lucide-react";
import { PageHeading } from "./AdminUI";

export default function StorePlaceholder() {
  return <>
    <PageHeading eyebrow="Future module" title="Store" description="Reserved for a later implementation phase." />
    <div className="flex min-h-100 flex-col items-center justify-center rounded-3xl border border-dashed border-[#cbd5cc] bg-white p-10 text-center">
      <span className="rounded-2xl bg-[#eaf1eb] p-5 text-[#3e6b52]"><PackageOpen size={30} /></span>
      <h2 className="mt-5 text-xl font-bold text-[#173b2a]">Store functionality will be implemented later.</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#6d796f]">No products, inventory, checkout, payments, or commerce logic have been created.</p>
    </div>
  </>;
}
