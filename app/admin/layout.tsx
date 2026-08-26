import AdministrationShell from "@/components/administration/AdministrationShell";
export default function AdminLayout({ children }: { children: React.ReactNode }) { return <AdministrationShell allowedRoles={["admin", "super_admin"]}>{children}</AdministrationShell>; }
