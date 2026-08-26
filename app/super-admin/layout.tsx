import AdministrationShell from "@/components/administration/AdministrationShell";
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) { return <AdministrationShell allowedRoles={["super_admin"]}>{children}</AdministrationShell>; }
