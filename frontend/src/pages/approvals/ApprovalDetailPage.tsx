import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle, XCircle, ShieldAlert } from "lucide-react";
import { expenseApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import type {  Expense  } from "../../types";
import { PageLoader, Spinner, Modal } from "../../components/ui/Common";
import { StatusBadge } from "../../components/ui/Badges";
import ApprovalTimeline from "../../components/ApprovalTimeline";

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const qc = useQueryClient();

  const [actionModal, setActionModal] = useState<"APPROVED" | "REJECTED" | "OVERRIDE" | null>(null);
  const [comment, setComment] = useState("");

  const { data: expense, isLoading } = useQuery({
    queryKey: ["expense", id],
    queryFn: async () => (await expenseApi.getById(id!)).data.data as Expense,
    enabled: !!id,
  });

  const actionMutation = useMutation({
    mutationFn: (data: { action: string; comment?: string; isManagerGate?: boolean }) =>
      expenseApi.takeAction(id!, data),
    onSuccess: (_data, vars) => {
      const label = vars.action === "APPROVED" ? "Approved" : "Rejected";
      toast.success(`Expense ${label} successfully`);
      qc.invalidateQueries({ queryKey: ["expense", id] });
      qc.invalidateQueries({ queryKey: ["pending-approvals"] });
      setActionModal(null);
      setComment("");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Action failed"),
  });

  const overrideMutation = useMutation({
    mutationFn: (data: { action: string; comment?: string }) =>
      expenseApi.override(id!, data),
    onSuccess: (_data, vars) => {
      toast.success(`Admin override: expense ${vars.action.toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ["expense", id] });
      qc.invalidateQueries({ queryKey: ["all-expenses"] });
      setActionModal(null);
      setComment("");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Override failed"),
  });

  if (isLoading) return <PageLoader />;
  if (!expense) return <div className="card text-center text-gray-400">Expense not found</div>;

  const isAdmin = user?.role === "ADMIN";
  const isPending = expense.status === "PENDING";
  const isManagerGate = expense.managerApproved === null;
  const currentStep = expense.activeFlow?.steps[expense.currentStepIndex];

  const isMyTurn = isPending && (
    isManagerGate ||
    currentStep?.stepApprovers.some(sa => sa.userId === user?.id)
  );
  const alreadyActed = expense.approvalActions.some(
    a => a.actorId === user?.id && a.stepId === currentStep?.id
  );

  const handleAction = (action: "APPROVED" | "REJECTED") => {
    actionMutation.mutate({ action, comment, isManagerGate });
  };

  const handleOverride = (action: "APPROVED" | "REJECTED") => {
    overrideMutation.mutate({ action, comment });
  };

  const isActing = actionMutation.isPending || overrideMutation.isPending;

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost btn btn-sm w-9 h-9 p-0 flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title">{expense.description}</h1>
            <p className="page-subtitle">
              {expense.submittedBy.name} · {expense.category} · {new Date(expense.expenseDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <StatusBadge status={expense.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Amount + Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <p className="text-xs text-gray-500 mb-1">Submitted Amount</p>
            <p className="text-xl font-bold text-gray-200">
              {expense.amount.toLocaleString()} {expense.currencyCode}
            </p>
            <div className="mt-3 pt-3 border-t border-surface-border">
              <p className="text-xs text-gray-500 mb-0.5">In Company Currency</p>
              <p className="text-3xl font-bold text-white">
                {company?.currencySymbol}{expense.convertedAmount?.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{company?.currencyCode}</p>
              {expense.isApproximateRate && (
                <p className="text-xs text-amber-500 mt-2">⚠ Approximate exchange rate</p>
              )}
            </div>
          </div>

          {expense.receiptUrl && (
            <div className="card">
              <p className="text-xs text-gray-400 mb-2 font-medium">Receipt</p>
              <img
                src={`http://localhost:4000${expense.receiptUrl}`}
                alt="Receipt"
                className="w-full rounded-xl object-contain max-h-48 bg-surface-elevated"
              />
            </div>
          )}

          {/* Action buttons */}
          {isPending && (
            <div className="card space-y-3">
              <h3 className="text-sm font-semibold text-gray-300">Your Action</h3>

              {isManagerGate ? (
                <p className="text-xs text-amber-400 bg-amber-400/10 rounded-lg p-2 border border-amber-400/20">
                  🔑 Manager gate: approve to start the approval flow
                </p>
              ) : currentStep ? (
                <p className="text-xs text-gray-500">
                  Step {expense.currentStepIndex + 1}: {currentStep.label}
                </p>
              ) : null}

              {isMyTurn && !alreadyActed ? (
                <>
                  <button
                    onClick={() => setActionModal("APPROVED")}
                    className="btn-success btn w-full"
                  >
                    <CheckCircle size={15} /> Approve
                  </button>
                  <button
                    onClick={() => setActionModal("REJECTED")}
                    className="btn-danger btn w-full"
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </>
              ) : alreadyActed ? (
                <p className="text-xs text-gray-500 text-center py-2">You have already acted on this step</p>
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">You are not assigned to the current step</p>
              )}

              {isAdmin && (
                <div className="pt-2 border-t border-surface-border">
                  <p className="text-xs text-gray-500 mb-2">Admin Override</p>
                  <button
                    onClick={() => setActionModal("OVERRIDE")}
                    className="btn btn-sm w-full bg-violet-600/10 text-violet-400 border border-violet-500/20 hover:bg-violet-600/20"
                  >
                    <ShieldAlert size={13} /> Force Override
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Timeline */}
        <div className="lg:col-span-3">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-5">Approval Timeline</h3>
            {expense.activeFlow ? (
              <ApprovalTimeline expense={expense} />
            ) : (
              <div className="empty-state py-8 text-gray-500 text-sm">No approval flow assigned</div>
            )}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      <Modal
        open={!!actionModal}
        onClose={() => { setActionModal(null); setComment(""); }}
        title={
          actionModal === "OVERRIDE" ? "Admin Override" :
          actionModal === "APPROVED" ? "Approve Expense" : "Reject Expense"
        }
      >
        <p className="text-sm text-gray-400 mb-4">
          {actionModal === "OVERRIDE"
            ? "As admin, you can force-approve or force-reject this expense, bypassing all approval rules."
            : actionModal === "APPROVED"
            ? "Add an optional comment with your approval."
            : "Please provide a reason for rejection."}
        </p>
        <div className="mb-4">
          <label className="label">Comment {actionModal === "REJECTED" ? "*" : "(optional)"}</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder={actionModal === "REJECTED" ? "Reason for rejection..." : "Optional note..."}
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>
        {actionModal === "OVERRIDE" ? (
          <div className="flex gap-3">
            <button
              onClick={() => handleOverride("APPROVED")}
              disabled={isActing}
              className="btn-success btn flex-1"
            >
              {isActing ? <Spinner size={14} /> : <><CheckCircle size={14} /> Force Approve</>}
            </button>
            <button
              onClick={() => handleOverride("REJECTED")}
              disabled={isActing}
              className="btn-danger btn flex-1"
            >
              {isActing ? <Spinner size={14} /> : <><XCircle size={14} /> Force Reject</>}
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => { setActionModal(null); setComment(""); }} className="btn-ghost btn flex-1">
              Cancel
            </button>
            <button
              onClick={() => handleAction(actionModal as "APPROVED" | "REJECTED")}
              disabled={isActing || (actionModal === "REJECTED" && !comment.trim())}
              className={actionModal === "APPROVED" ? "btn-success btn flex-1" : "btn-danger btn flex-1"}
            >
              {isActing ? <Spinner size={14} /> : actionModal === "APPROVED" ? "Approve" : "Reject"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
