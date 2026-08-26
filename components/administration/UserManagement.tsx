"use client";

import { AlertTriangle, BriefcaseBusiness, CheckCircle2, ChevronDown, MoreHorizontal, Pencil, Search, ShieldCheck, Trash2, UserCog, UserMinus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AdminUser, administrationApi, Assessment, Paginated, SystemRole } from "@/lib/administrationApi";
import { ErrorState, inputClass, LoadingState, PageHeading, StatusBadge } from "./AdminUI";

type ActiveAssignment = NonNullable<AdminUser["facilitator_assignments"]>[number];
type AccountUpdateResponse = { message: string; user: AdminUser };

export default function UserManagement({ mode }: { mode: "super" | "admin" }) {
  const prefix = mode === "super" ? "super-admin" : "admin";
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionMenu, setActionMenu] = useState<{ userId: number; top: number; right: number } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<AdminUser | null>(null);
  const [assignmentFacilitator, setAssignmentFacilitator] = useState<AdminUser | null>(null);
  const [projects, setProjects] = useState<Assessment[]>([]);
  const [projectQuery, setProjectQuery] = useState("");
  const [projectPage, setProjectPage] = useState(1);
  const [projectLastPage, setProjectLastPage] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [removeCandidate, setRemoveCandidate] = useState<{ facilitator: AdminUser; assignment: ActiveAssignment } | null>(null);
  const [assignedProjectSearch, setAssignedProjectSearch] = useState<Record<number, string>>({});
  const [openAssignedProjectsId, setOpenAssignedProjectsId] = useState<number | null>(null);
  const [editCandidate, setEditCandidate] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", email: "" });
  const [editError, setEditError] = useState("");
  const hasLoadedUsers = useRef(false);

  const load = useCallback(async () => {
    if (!hasLoadedUsers.current) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (role) params.set("role", role);
      if (mode === "admin") params.set("include_assignments", "1");
      const result = await administrationApi<Paginated<AdminUser>>(`${prefix}/users?${params}`);
      setUsers(result.data);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load users."); }
    finally { hasLoadedUsers.current = true; setLoading(false); }
  }, [mode, prefix, query, role]);

  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [load]);

  useEffect(() => {
    if (!assignmentFacilitator) return;
    const id = setTimeout(async () => {
      setProjectsLoading(true);
      setAssignmentError("");
      try {
        const params = new URLSearchParams();
        if (projectQuery.trim()) params.set("q", projectQuery.trim());
        params.set("page", String(projectPage));
        const result = await administrationApi<Paginated<Assessment>>(`admin/assessments?${params}`);
        setProjects(result.data);
        setProjectLastPage(result.last_page);
      } catch (reason) {
        setAssignmentError(reason instanceof Error ? reason.message : "Unable to load projects.");
      } finally {
        setProjectsLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [assignmentFacilitator, projectPage, projectQuery]);

  const updateRole = async (user: AdminUser, systemRole: SystemRole) => {
    setBusyId(user.id); setError("");
    try {
      await administrationApi(`${prefix}/users/${user.id}/role`, { method: "PATCH", body: JSON.stringify({ system_role: systemRole }) });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Role update failed."); }
    finally { setBusyId(null); }
  };

  const openAccountEditor = (user: AdminUser) => {
    setActionMenu(null);
    setEditCandidate(user);
    setEditForm({ first_name: user.first_name, last_name: user.last_name, email: user.email });
    setEditError("");
  };

  const updateAccount = async () => {
    if (!editCandidate || mode !== "super") return;
    setBusyId(editCandidate.id);
    setEditError("");
    try {
      const result = await administrationApi<AccountUpdateResponse>(`super-admin/users/${editCandidate.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
          email: editForm.email.trim().toLowerCase(),
        }),
      });
      setUsers((current) => current.map((user) => user.id === result.user.id ? { ...user, ...result.user } : user));
      setEditCandidate(null);
    } catch (reason) {
      setEditError(reason instanceof Error ? reason.message : "Account update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteAccount = async (user: AdminUser) => {
    setBusyId(user.id); setError("");
    try {
      await administrationApi(`${prefix}/users/${user.id}`, { method: "DELETE" });
      setDeleteCandidate(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Account deletion failed."); }
    finally { setBusyId(null); }
  };

  const openAssignmentDialog = (facilitator: AdminUser) => {
    setAssignmentFacilitator(facilitator);
    setProjectQuery("");
    setProjectPage(1);
    setProjectLastPage(1);
    setSelectedProjectId(null);
    setProjects([]);
    setAssignmentError("");
  };

  const closeAssignmentDialog = () => {
    setAssignmentFacilitator(null);
    setSelectedProjectId(null);
    setProjectQuery("");
    setProjectPage(1);
    setAssignmentError("");
  };

  const assignSelectedProject = async () => {
    if (!assignmentFacilitator || !selectedProjectId) return;
    const project = projects.find((item) => item.id === selectedProjectId);
    if (!project) return;
    const activeAssignments = project.facilitator_assignments || [];
    if (activeAssignments.some((assignment) => assignment.user_id === assignmentFacilitator.id)) return;

    setAssignmentBusy(true);
    setAssignmentError("");
    try {
      const isReplacement = activeAssignments.length === 1;
      await administrationApi(isReplacement
        ? `admin/assignments/${activeAssignments[0].id}`
        : `admin/assessments/${project.id}/assign`, {
        method: isReplacement ? "PATCH" : "POST",
        body: JSON.stringify({ user_id: assignmentFacilitator.id }),
      });
      await load();
      closeAssignmentDialog();
    } catch (reason) {
      setAssignmentError(reason instanceof Error ? reason.message : "Unable to assign this project.");
    } finally {
      setAssignmentBusy(false);
    }
  };

  const removeAssignment = async () => {
    if (!removeCandidate) return;
    const { facilitator, assignment } = removeCandidate;
    setAssignmentBusy(true);
    setError("");
    try {
      await administrationApi(`admin/assignments/${assignment.id}`, { method: "DELETE" });
      setUsers((current) => current.map((user) => user.id === facilitator.id ? {
        ...user,
        facilitator_assignments: user.facilitator_assignments?.filter((item) => item.id !== assignment.id),
      } : user));
      setRemoveCandidate(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to remove this assignment.");
    } finally {
      setAssignmentBusy(false);
    }
  };

  const filterRoles = mode === "super" ? ["", "super_admin", "admin", "facilitator_admin", "user"] : ["", "admin", "user", "facilitator_admin"];
  const menuUser = actionMenu ? users.find((user) => user.id === actionMenu.userId) : null;
  const menuTargets: SystemRole[] = menuUser
    ? (mode === "super"
      ? (["user", "facilitator_admin", "admin"] as SystemRole[]).filter((target) => target !== menuUser.system_role)
      : [menuUser.system_role === "facilitator_admin" ? "user" : "facilitator_admin"])
    : [];
  const roleActionLabel = (target: SystemRole) => target === "user"
    ? "Change to User"
    : target === "facilitator_admin" ? "Change to Facilitator Admin" : "Change to Admin";
  const selectedProject = selectedProjectId ? projects.find((project) => project.id === selectedProjectId) : null;
  const selectedProjectAssignments = selectedProject?.facilitator_assignments || [];
  const assignmentActionLabel = selectedProjectAssignments.length === 0
    ? "Assign project"
    : selectedProjectAssignments.length === 1 ? "Reassign project" : "Add facilitator";
  const assignmentImpactText = selectedProjectAssignments.length === 0
    ? "The facilitator will receive access to the selected project."
    : selectedProjectAssignments.length === 1
      ? "Reassignment immediately removes the previous facilitator’s project access."
      : "This adds the facilitator alongside the project’s existing facilitators.";

  const toggleActionMenu = (userId: number, button: HTMLButtonElement) => {
    if (actionMenu?.userId === userId) {
      setActionMenu(null);
      return;
    }
    const rect = button.getBoundingClientRect();
    const menuHeight = mode === "super" ? 220 : 104;
    const top = rect.bottom + 6 + menuHeight > window.innerHeight ? rect.top - menuHeight - 6 : rect.bottom + 6;
    setActionMenu({ userId, top, right: window.innerWidth - rect.right });
  };

  return <>
    <PageHeading eyebrow={mode === "super" ? "System governance" : "Operational access"} title={mode === "super" ? "User management" : "Facilitator management"} description={mode === "super" ? "Assign User, Facilitator Admin, or Admin access to any non-Super-Admin account. Your own role and all Super Admin accounts remain protected." : "Promote users to Facilitator Admin, then assign and manage their project access here. Admin and SuperAdmin roles remain outside this module."} />
    <div className="mb-5 grid gap-3 rounded-2xl border border-[#e1e5de] bg-white p-4 sm:grid-cols-[1fr_220px]"><label className="relative"><Search className="absolute left-3.5 top-3 text-[#819087]" size={17} /><input className={`${inputClass} pl-10`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" /></label><select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>{filterRoles.map((value) => <option key={value} value={value}>{value ? value.replaceAll("_", " ") : mode === "super" ? "All roles" : "All managed roles"}</option>)}</select></div>
    {error && <div className="mb-4"><ErrorState message={error} /></div>}
    {loading ? <LoadingState /> : <div className="overflow-hidden rounded-3xl border border-[#e1e5de] bg-white">
      <div className="overflow-x-auto">
        <table className={`w-full text-left ${mode === "admin" ? "min-w-250" : "min-w-190"}`}>
          <thead className="bg-[#f7f8f5] text-xs uppercase tracking-[0.1em] text-[#77827b]">
            <tr>
              <th className="px-6 py-4">Account</th>
              <th className="px-6 py-4">Current role</th>
              {mode === "admin" && <th className="px-6 py-4">Assigned projects</th>}
              <th className="px-6 py-4">Verified</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0eb]">{users.map((user) => {
            const canManage = mode === "super" ? ["user", "facilitator_admin", "admin"].includes(user.system_role) : ["user", "facilitator_admin"].includes(user.system_role);
            const assignments = user.facilitator_assignments || [];
            const assignmentSearch = (assignedProjectSearch[user.id] || "").trim().toLowerCase();
            const visibleAssignments = assignments.filter((assignment) => {
              if (!assignmentSearch) return true;
              return [assignment.project?.name, assignment.project?.owner?.first_name, assignment.project?.owner?.last_name, assignment.project?.owner?.email]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(assignmentSearch));
            });
            return <tr key={user.id} className="align-top hover:bg-[#fafbf8]">
              <td className="px-6 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf1eb] text-[#3e6b52]"><UserCog size={16} /></span><div><p className="text-base font-semibold text-[#27332c]">{user.first_name} {user.last_name}</p><p className="mt-0.5 text-sm text-[#7b8780]">{user.email}</p></div></div></td>
              <td className="px-6 py-4"><StatusBadge value={user.system_role} /></td>
              {mode === "admin" && <td className="max-w-90 px-6 py-4">
                {user.system_role === "facilitator_admin" ? <div>
                  {assignments.length > 0 ? <div className={`rounded-xl border transition-colors duration-200 ${openAssignedProjectsId === user.id ? "border-[#cfdcd1] bg-white" : "border-[#dfe7e0] bg-[#f7faf7]"}`}>
                    <button type="button" aria-expanded={openAssignedProjectsId === user.id} aria-controls={`assigned-projects-${user.id}`} onClick={() => setOpenAssignedProjectsId((current) => current === user.id ? null : user.id)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-semibold text-[#405047]"><span>{assignments.length} assigned {assignments.length === 1 ? "project" : "projects"}</span><ChevronDown size={14} className={`shrink-0 text-[#718078] transition-transform duration-200 ease-out ${openAssignedProjectsId === user.id ? "rotate-180" : "rotate-0"}`} /></button>
                    <div id={`assigned-projects-${user.id}`} className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${openAssignedProjectsId === user.id ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="min-h-0 overflow-hidden"><div className="border-t border-[#e5ebe5] p-2.5">
                        <label className="relative block"><Search className="absolute left-2.5 top-2.5 text-[#8a958e]" size={14} /><input value={assignedProjectSearch[user.id] || ""} onChange={(event) => setAssignedProjectSearch((current) => ({ ...current, [user.id]: event.target.value }))} placeholder="Search assigned projects" className="w-full rounded-lg border border-[#dfe6df] bg-white py-2 pl-8 pr-3 text-sm text-[#405047] outline-none transition-colors focus:border-[#8eac98]" /></label>
                        <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">{visibleAssignments.map((assignment) => <div key={assignment.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#f1f6f2] px-2.5 py-1.5">
                          <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#3d5346]">{assignment.project?.name || `Project #${assignment.project_id}`}</p><p className="mt-0.5 truncate text-sm text-[#7c8880]">{assignment.project?.owner?.email}</p></div>
                          <button type="button" aria-label={`Remove ${assignment.project?.name || "project"} from ${user.first_name} ${user.last_name}`} disabled={assignmentBusy} onClick={() => setRemoveCandidate({ facilitator: user, assignment })} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#a8736c] transition-colors hover:bg-[#f7ecea] hover:text-[#8f554d] disabled:opacity-40"><Trash2 size={12} /></button>
                        </div>)}{visibleAssignments.length === 0 && <p className="px-2 py-4 text-center text-sm text-[#8b958f]">No assigned projects match.</p>}</div>
                      </div></div>
                    </div>
                  </div> : <p className="text-sm text-[#8b958f]">No assigned projects</p>}
                </div> : <span className="text-xs text-[#a0a8a3]">—</span>}
              </td>}
              <td className="px-6 py-4 text-sm text-[#65736a]">{user.email_verified_at ? "Verified" : "Pending"}</td>
              <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1.5">
                {mode === "admin" && user.system_role === "facilitator_admin" && <button type="button" disabled={assignmentBusy} onClick={() => openAssignmentDialog(user)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf2eb] px-3 py-2 text-sm font-semibold text-[#315b45] transition hover:bg-[#dce9df] disabled:opacity-40"><BriefcaseBusiness size={15} />Assign project</button>}
                {canManage && <button type="button" aria-label={`Actions for ${user.first_name} ${user.last_name}`} aria-expanded={actionMenu?.userId === user.id} disabled={busyId === user.id} onClick={(event) => toggleActionMenu(user.id, event.currentTarget)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#647169] transition-colors hover:bg-[#edf3ee] hover:text-[#28543d] disabled:opacity-40"><MoreHorizontal size={20} /></button>}
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {users.length === 0 && <p className="p-10 text-center text-sm text-[#7b8780]">No matching users found.</p>}
    </div>}
    {actionMenu && menuUser && menuTargets.length > 0 && createPortal(<>
      <button type="button" aria-label="Close actions menu" className="fixed inset-0 z-60 cursor-default" onClick={() => setActionMenu(null)} />
      <div className="fixed z-70 min-w-48 rounded-xl border border-[#dfe5df] bg-white p-1.5 shadow-[0_14px_35px_rgba(23,59,42,0.16)]" style={{ top: actionMenu.top, right: actionMenu.right }}>
        {mode === "super" && <>
          <button type="button" disabled={busyId === menuUser.id} onClick={() => openAccountEditor(menuUser)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#315b45] transition-colors hover:bg-[#edf3ee] disabled:opacity-50">
            <Pencil size={15} />Edit name and email
          </button>
          <div className="my-1 border-t border-[#edf0eb]" />
        </>}
        <p className="px-3 pb-1.5 pt-1 text-xs font-bold uppercase tracking-[0.1em] text-[#8a948e]">Change role</p>
        {menuTargets.map((target) => <button key={target} type="button" disabled={busyId === menuUser.id} onClick={() => { setActionMenu(null); void updateRole(menuUser, target); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#315b45] transition-colors hover:bg-[#edf3ee] disabled:opacity-50">
          <ShieldCheck size={15} />{roleActionLabel(target)}
        </button>)}
        <div className="my-1 border-t border-[#edf0eb]" />
        <button type="button" disabled={busyId === menuUser.id} onClick={() => { setActionMenu(null); setDeleteCandidate(menuUser); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
          <Trash2 size={15} />Delete account
        </button>
      </div>
    </>, document.body)}
    {mode === "super" && editCandidate && createPortal(<div className="fixed inset-0 z-80 flex items-center justify-center bg-[#14251c]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-account-title">
      <button type="button" aria-label="Close account editor" className="absolute inset-0 cursor-default" disabled={busyId === editCandidate.id} onClick={() => setEditCandidate(null)} />
      <form className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_70px_rgba(20,37,28,0.24)]" onSubmit={(event) => { event.preventDefault(); void updateAccount(); }}>
        <div className="flex items-start justify-between gap-4 border-b border-[#e6ebe6] px-6 py-5">
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#789083]">Super Admin account editor</p><h2 id="edit-account-title" className="mt-1.5 text-xl font-bold text-[#1f2d25]">Edit account details</h2><p className="mt-1 text-sm text-[#748078]">{editCandidate.system_role.replaceAll("_", " ")}</p></div>
          <button type="button" aria-label="Close" disabled={busyId === editCandidate.id} onClick={() => setEditCandidate(null)} className="rounded-full bg-[#f1f3ef] p-2 text-[#65736a] disabled:opacity-40"><X size={17} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {editError && <ErrorState message={editError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-2 block text-sm font-semibold text-[#59675e]">First name</span><input required maxLength={255} autoFocus className={inputClass} value={editForm.first_name} onChange={(event) => setEditForm((current) => ({ ...current, first_name: event.target.value }))} /></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-[#59675e]">Last name</span><input required maxLength={255} className={inputClass} value={editForm.last_name} onChange={(event) => setEditForm((current) => ({ ...current, last_name: event.target.value }))} /></label>
          </div>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-[#59675e]">Email address</span><input required type="email" maxLength={255} className={inputClass} value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} /></label>
          {editForm.email.trim().toLowerCase() !== editCandidate.email.toLowerCase() && <p className="rounded-xl bg-[#fff7e8] px-3.5 py-3 text-sm leading-6 text-[#795e2b]">Changing the email address resets its verification status. The account will remain active, but the new address must be verified.</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#e6ebe6] bg-[#fafbf9] px-6 py-4">
          <button type="button" disabled={busyId === editCandidate.id} onClick={() => setEditCandidate(null)} className="rounded-xl border border-[#dfe4dc] px-4 py-2.5 text-sm font-semibold text-[#536159] hover:bg-white disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={busyId === editCandidate.id || !editForm.first_name.trim() || !editForm.last_name.trim() || !editForm.email.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#315b45] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#264a39] disabled:cursor-not-allowed disabled:opacity-45"><Pencil size={15} />{busyId === editCandidate.id ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </div>, document.body)}
    {assignmentFacilitator && createPortal(<div className="fixed inset-0 z-80 flex items-center justify-center bg-[#14251c]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="assign-project-title">
      <button type="button" aria-label="Close project assignment" className="absolute inset-0 cursor-default" disabled={assignmentBusy} onClick={closeAssignmentDialog} />
      <div className="relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_70px_rgba(20,37,28,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e6ebe6] px-6 py-5">
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#789083]">Assign project</p><h2 id="assign-project-title" className="mt-1.5 text-xl font-bold text-[#1f2d25]">{assignmentFacilitator.first_name} {assignmentFacilitator.last_name}</h2><p className="mt-1 text-sm text-[#748078]">{assignmentFacilitator.email}</p></div>
          <button type="button" aria-label="Close" disabled={assignmentBusy} onClick={closeAssignmentDialog} className="rounded-full bg-[#f1f3ef] p-2 text-[#65736a] disabled:opacity-40"><X size={17} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <label className="relative block"><Search className="absolute left-3.5 top-3 text-[#819087]" size={17} /><input className={`${inputClass} pl-10`} value={projectQuery} onChange={(event) => { setProjectQuery(event.target.value); setProjectPage(1); setSelectedProjectId(null); }} placeholder="Search project or client email" autoFocus /></label>
          <div className="mt-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#59675e]">Available projects</p><p className="text-xs text-[#89938d]">{projectsLoading ? "Updating…" : "Select one project"}</p></div>
          {assignmentError && <div className="mt-3"><ErrorState message={assignmentError} /></div>}
          {projectsLoading && projects.length === 0 ? <div className="py-8"><LoadingState /></div> : <div className={`mt-3 space-y-2 transition-opacity duration-150 ${projectsLoading ? "pointer-events-none opacity-60" : "opacity-100"}`}>
            {projects.map((project) => {
              const active = project.facilitator_assignments || [];
              const alreadyAssigned = active.some((assignment) => assignment.user_id === assignmentFacilitator.id);
              const assignedNames = active.map((assignment) => `${assignment.facilitator?.first_name || ""} ${assignment.facilitator?.last_name || ""}`.trim()).filter(Boolean);
              return <label key={project.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition ${alreadyAssigned ? "cursor-not-allowed border-[#e4e7e3] bg-[#f6f7f5] opacity-70" : selectedProjectId === project.id ? "cursor-pointer border-[#8eac98] bg-[#f2f7f3]" : "cursor-pointer border-[#e1e6e1] bg-white hover:border-[#b9cbbf]"}`}>
                <input type="radio" name="project-assignment" className="mt-1 h-4 w-4 accent-[#3e6b52]" checked={selectedProjectId === project.id} disabled={alreadyAssigned} onChange={() => setSelectedProjectId(project.id)} />
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-base font-semibold text-[#2d3a32]">{project.name}</p><StatusBadge value={project.assessment_status} /></div><p className="mt-1 text-sm text-[#758178]">{project.owner ? `${project.owner.first_name} ${project.owner.last_name} · ${project.owner.email}` : "Client details unavailable"}</p><div className="mt-2 flex items-center gap-1.5 text-sm text-[#68756d]">{alreadyAssigned ? <><CheckCircle2 size={14} className="text-[#3e6b52]" />Already assigned to this facilitator</> : assignedNames.length > 0 ? <>Currently assigned to <strong className="font-semibold text-[#425248]">{assignedNames.join(", ")}</strong></> : <span className="font-semibold text-[#8a6420]">Unassigned</span>}</div></div>
              </label>;
            })}
            {projects.length === 0 && <p className="rounded-xl border border-dashed border-[#d8dfd8] p-8 text-center text-sm text-[#7d8981]">No projects match this search.</p>}
            {projectLastPage > 1 && <div className="flex items-center justify-between pt-2"><button type="button" disabled={projectPage <= 1 || projectsLoading} onClick={() => { setProjectPage((page) => page - 1); setSelectedProjectId(null); }} className="rounded-lg border border-[#dfe5df] px-3 py-2 text-sm font-semibold text-[#536159] disabled:opacity-40">Previous</button><span className="text-xs text-[#7b8780]">Page {projectPage} of {projectLastPage}</span><button type="button" disabled={projectPage >= projectLastPage || projectsLoading} onClick={() => { setProjectPage((page) => page + 1); setSelectedProjectId(null); }} className="rounded-lg border border-[#dfe5df] px-3 py-2 text-sm font-semibold text-[#536159] disabled:opacity-40">Next</button></div>}
          </div>}
        </div>
        <div className="flex flex-col gap-3 border-t border-[#e6ebe6] bg-[#fafbf9] px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#7b8780]">{selectedProject ? assignmentImpactText : "Select a project to continue."}</p><div className="flex justify-end gap-2"><button type="button" disabled={assignmentBusy} onClick={closeAssignmentDialog} className="rounded-xl border border-[#dfe4dc] px-4 py-2.5 text-sm font-semibold text-[#536159] hover:bg-white disabled:opacity-50">Cancel</button><button type="button" disabled={!selectedProject || assignmentBusy} onClick={() => void assignSelectedProject()} className="inline-flex items-center gap-2 rounded-xl bg-[#315b45] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#264a39] disabled:cursor-not-allowed disabled:opacity-45"><BriefcaseBusiness size={15} />{assignmentBusy ? "Assigning…" : assignmentActionLabel}</button></div></div>
      </div>
    </div>, document.body)}
    {removeCandidate && createPortal(<div className="fixed inset-0 z-90 flex items-center justify-center bg-[#14251c]/45 p-5 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="remove-assignment-title">
      <button type="button" aria-label="Close confirmation" className="absolute inset-0 cursor-default" disabled={assignmentBusy} onClick={() => setRemoveCandidate(null)} />
      <div className="relative w-full max-w-md rounded-3xl border border-[#ead9d6] bg-white p-6 shadow-[0_24px_70px_rgba(20,37,28,0.24)]"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600"><UserMinus size={20} /></span><h2 id="remove-assignment-title" className="mt-4 text-xl font-bold text-[#1f2d25]">Remove project assignment?</h2><p className="mt-2 text-sm leading-6 text-[#68756d]">Remove <strong className="text-[#314139]">{removeCandidate.assignment.project?.name || `Project #${removeCandidate.assignment.project_id}`}</strong> from {removeCandidate.facilitator.first_name} {removeCandidate.facilitator.last_name}?</p><p className="mt-3 rounded-xl bg-red-50 px-3.5 py-3 text-sm leading-6 text-red-700">The facilitator will immediately lose access to this project.</p><div className="mt-6 flex justify-end gap-2"><button type="button" disabled={assignmentBusy} onClick={() => setRemoveCandidate(null)} className="rounded-xl border border-[#dfe4dc] px-4 py-2.5 text-sm font-semibold text-[#536159] disabled:opacity-50">Cancel</button><button type="button" disabled={assignmentBusy} onClick={() => void removeAssignment()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><UserMinus size={15} />{assignmentBusy ? "Removing…" : "Remove assignment"}</button></div></div>
    </div>, document.body)}
    {deleteCandidate && createPortal(<div className="fixed inset-0 z-80 flex items-center justify-center bg-[#14251c]/45 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
      <button type="button" aria-label="Close confirmation" className="absolute inset-0 cursor-default" disabled={busyId === deleteCandidate.id} onClick={() => setDeleteCandidate(null)} />
      <div className="relative w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-[0_24px_70px_rgba(20,37,28,0.24)] sm:p-7">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertTriangle size={21} /></span>
        <h2 id="delete-account-title" className="mt-4 text-xl font-bold text-[#1f2d25]">Delete this account?</h2>
        <p className="mt-2 text-sm leading-6 text-[#68756d]">Are you sure you want to delete <strong className="font-semibold text-[#314139]">{deleteCandidate.first_name} {deleteCandidate.last_name}</strong>?</p>
        <p className="mt-1 text-sm text-[#879189]">{deleteCandidate.email}</p>
        <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-3 text-sm leading-6 text-red-700">This action is permanent and will remove the account and its related data.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={busyId === deleteCandidate.id} onClick={() => setDeleteCandidate(null)} className="rounded-xl border border-[#dfe4dc] px-4 py-2.5 text-sm font-semibold text-[#536159] transition-colors hover:bg-[#f5f7f4] disabled:opacity-50">Cancel</button>
          <button type="button" disabled={busyId === deleteCandidate.id} onClick={() => void deleteAccount(deleteCandidate)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"><Trash2 size={16} />{busyId === deleteCandidate.id ? "Deleting…" : "Delete account"}</button>
        </div>
      </div>
    </div>, document.body)}
  </>;
}
