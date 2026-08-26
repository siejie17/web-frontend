import AdministrationShell from "@/components/administration/AdministrationShell";
export default function FacilitatorLayout({ children }: { children: React.ReactNode }) { return <AdministrationShell allowedRoles={["facilitator_admin"]}>{children}</AdministrationShell>; }
