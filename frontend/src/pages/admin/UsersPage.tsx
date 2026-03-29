import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, UserCheck, Shield } from "lucide-react";
import { userApi } from "../../api";
import type {  User  } from "../../types";
import { PageLoader, Spinner, Modal, ConfirmModal } from "../../components/ui/Common";
import { RoleBadge } from "../../components/ui/Badges";
import { useAuthStore } from "../../store/authStore";

const BLANK_FORM = { name: "", email: "", password: "", role: "EMPLOYEE" as const, managerId: "", isManagerApprover: false };

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await userApi.getAll()).data.data as User[],
  });

  const createMutation = useMutation({
    mutationFn: () => userApi.create({
      name: form.name, email: form.email, password: form.password,
      role: form.role, managerId: form.managerId || undefined, isManagerApprover: form.isManagerApprover,
    }),
    onSuccess: () => {
      toast.success("User created successfully");
      qc.invalidateQueries({ queryKey: ["users"] });
      setModal(null);
      setForm({ ...BLANK_FORM });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Create failed"),
  });

  const updateMutation = useMutation({
    mutationFn: () => userApi.update(editTarget!.id, {
      role: form.role as any, managerId: form.managerId || null, isManagerApprover: form.isManagerApprover, name: form.name,
    }),
    onSuccess: () => {
      toast.success("User updated");
      qc.invalidateQueries({ queryKey: ["users"] });
      setModal(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => userApi.delete(deleteTarget!.id),
    onSuccess: () => {
      toast.success("User removed");
      qc.invalidateQueries({ queryKey: ["users"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Delete failed"),
  });

  const openEdit = (u: User) => {
    setEditTarget(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role as any === "ADMIN" ? "MANAGER" : u.role as any, managerId: u.managerId ?? "", isManagerApprover: u.isManagerApprover });
    setModal("edit");
  };

  const openCreate = () => { setForm({ ...BLANK_FORM }); setEditTarget(null); setModal("create"); };

  if (isLoading) return <PageLoader />;

  const managers = users?.filter(u => u.role === "MANAGER" || u.role === "ADMIN") ?? [];

  const isLoading_ = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">{users?.length ?? 0} people in your company</p>
        </div>
        <button onClick={openCreate} className="btn-primary btn">
          <Plus size={16} /> Add Member
        </button>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Manager</th>
              <th>Manager Approver</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-400 font-semibold text-xs flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-white">{u.name}</span>
                    {u.id === me?.id && <span className="badge-draft text-xs">you</span>}
                  </div>
                </td>
                <td className="text-gray-400">{u.email}</td>
                <td><RoleBadge role={u.role} /></td>
                <td className="text-gray-400 text-xs">{u.manager?.name ?? "—"}</td>
                <td>
                  {u.isManagerApprover ? (
                    <div className="flex items-center gap-1 text-emerald-400 text-xs">
                      <UserCheck size={13} /> Yes
                    </div>
                  ) : (
                    <span className="text-gray-600 text-xs">No</span>
                  )}
                </td>
                <td className="text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="flex items-center gap-1">
                    {u.id !== me?.id && u.role !== "ADMIN" && (
                      <>
                        <button onClick={() => openEdit(u)} className="p-1.5 text-gray-500 hover:text-primary-400 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteTarget(u)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                    {u.role === "ADMIN" && <Shield size={13} className="text-primary-500" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Add Team Member" : "Edit Member"}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" placeholder="Jane Smith" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          {modal === "create" && (
            <>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="jane@company.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" placeholder="Temporary password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            </>
          )}
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}>
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
          <div>
            <label className="label">Direct Manager (optional)</label>
            <select className="input" value={form.managerId}
              onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}>
              <option value="">No manager</option>
              {managers.filter(m => m.id !== editTarget?.id).map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isManagerApprover" checked={form.isManagerApprover}
              onChange={e => setForm(f => ({ ...f, isManagerApprover: e.target.checked }))}
              className="w-4 h-4 accent-primary-500 cursor-pointer" />
            <label htmlFor="isManagerApprover" className="text-sm text-gray-300 cursor-pointer">
              This person must approve their team's expenses (Manager Gate)
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(null)} className="btn-ghost btn flex-1">Cancel</button>
            <button
              onClick={() => modal === "create" ? createMutation.mutate() : updateMutation.mutate()}
              disabled={isLoading_}
              className="btn-primary btn flex-1"
            >
              {isLoading_ ? <Spinner size={14} /> : modal === "create" ? "Create Member" : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
        title="Remove Team Member"
        message={`Remove ${deleteTarget?.name} from the company? This cannot be undone.`}
        danger
      />
    </div>
  );
}
