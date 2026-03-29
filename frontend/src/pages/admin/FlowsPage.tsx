import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, GitBranch, Star, Trash2, Pencil, ArrowRight } from "lucide-react";
import { flowApi } from "../../api";
import type {  ApprovalFlow  } from "../../types";
import { PageLoader, ConfirmModal } from "../../components/ui/Common";
import { RuleTypeBadge } from "../../components/ui/Badges";

export default function FlowsPage() {
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<ApprovalFlow | null>(null);

  const { data: flows, isLoading } = useQuery({
    queryKey: ["flows"],
    queryFn: async () => (await flowApi.getAll()).data.data as ApprovalFlow[],
  });

  const deleteMutation = useMutation({
    mutationFn: () => flowApi.delete(deleteTarget!.id),
    onSuccess: () => {
      toast.success("Flow deleted");
      qc.invalidateQueries({ queryKey: ["flows"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Delete failed"),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => flowApi.setDefault(id),
    onSuccess: () => {
      toast.success("Default flow updated");
      qc.invalidateQueries({ queryKey: ["flows"] });
    },
    onError: () => toast.error("Failed to set default"),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approval Flows</h1>
          <p className="page-subtitle">{flows?.length ?? 0} flows configured</p>
        </div>
        <Link to="/admin/flows/new" className="btn-primary btn">
          <Plus size={16} /> Create Flow
        </Link>
      </div>

      {flows?.length === 0 ? (
        <div className="card empty-state">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
            <GitBranch size={28} className="text-primary-400" />
          </div>
          <p className="text-white font-semibold">No approval flows yet</p>
          <p className="text-gray-500 text-sm mt-1">Create your first flow to start routing expenses</p>
          <Link to="/admin/flows/new" className="btn-primary btn btn-sm mt-4"><Plus size={14} /> Create Flow</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {flows!.map(flow => (
            <div key={flow.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <GitBranch size={20} className="text-primary-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{flow.name}</h3>
                      {flow.isDefault && (
                        <span className="badge bg-amber-400/10 text-amber-400 border border-amber-400/20 text-xs">
                          <Star size={10} /> Default
                        </span>
                      )}
                      <span className="badge-draft text-xs">{flow.steps.length} steps</span>
                      {(flow._count?.expenses ?? 0) > 0 && (
                        <span className="text-xs text-gray-500">{flow._count?.expenses} expenses</span>
                      )}
                    </div>
                    {flow.description && <p className="text-sm text-gray-400 mt-0.5">{flow.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!flow.isDefault && (
                    <button
                      onClick={() => setDefaultMutation.mutate(flow.id)}
                      className="btn-ghost btn btn-sm text-xs"
                    >
                      Set Default
                    </button>
                  )}
                  <Link to={`/admin/flows/${flow.id}/edit`} className="btn-ghost btn btn-sm">
                    <Pencil size={13} />
                  </Link>
                  {!flow.isDefault && (
                    <button onClick={() => setDeleteTarget(flow)} className="btn-danger btn btn-sm">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Steps preview */}
              {flow.steps.length > 0 && (
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {flow.steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-surface-elevated border border-surface-border rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-gray-500">{idx + 1}.</span>
                        <span className="text-gray-200">{step.label}</span>
                        <RuleTypeBadge type={step.ruleType} />
                        <span className="text-gray-500">{step.stepApprovers.length} approver{step.stepApprovers.length !== 1 ? "s" : ""}</span>
                      </div>
                      {idx < flow.steps.length - 1 && <ArrowRight size={12} className="text-gray-600 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
        title="Delete Approval Flow"
        message={`Delete "${deleteTarget?.name}"? Expenses using this flow will lose their assignment.`}
        danger
      />
    </div>
  );
}
