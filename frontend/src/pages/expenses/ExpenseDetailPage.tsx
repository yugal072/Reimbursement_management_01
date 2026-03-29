import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, Download, RefreshCw, ExternalLink } from "lucide-react";
import { expenseApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import type {  Expense  } from "../../types";
import { PageLoader, Spinner, ConfirmModal } from "../../components/ui/Common";
import { StatusBadge } from "../../components/ui/Badges";
import ApprovalTimeline from "../../components/ApprovalTimeline";

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const qc = useQueryClient();
  const [confirmResubmit, setConfirmResubmit] = useState(false);

  const { data: expense, isLoading } = useQuery({
    queryKey: ["expense", id],
    queryFn: async () => (await expenseApi.getById(id!)).data.data as Expense,
    enabled: !!id,
  });

  const resubmitMutation = useMutation({
    mutationFn: () => expenseApi.resubmit(id!),
    onSuccess: () => {
      toast.success("Expense resubmitted for approval");
      qc.invalidateQueries({ queryKey: ["expense", id] });
      qc.invalidateQueries({ queryKey: ["my-expenses"] });
      setConfirmResubmit(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Resubmit failed"),
  });

  if (isLoading) return <PageLoader />;
  if (!expense) return <div className="card text-center text-gray-400">Expense not found</div>;

  const isOwner = expense.submittedById === user?.id;
  const isRejected = expense.status === "REJECTED";
  const canResubmit = isOwner && isRejected;

  return (
    <div className="animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost btn btn-sm w-9 h-9 p-0 flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title">{expense.description}</h1>
            <p className="page-subtitle">{expense.category} · {new Date(expense.expenseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={expense.status} />
          {canResubmit && (
            <button onClick={() => setConfirmResubmit(true)} className="btn-primary btn btn-sm">
              <RefreshCw size={13} /> Resubmit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Amount card */}
          <div className="card">
            <p className="text-xs text-gray-500 mb-1">Amount Submitted</p>
            <p className="text-3xl font-bold text-white">
              {expense.amount.toLocaleString()} <span className="text-lg text-gray-400">{expense.currencyCode}</span>
            </p>
            {expense.currencyCode !== company?.currencyCode && (
              <div className="mt-3 pt-3 border-t border-surface-border">
                <p className="text-xs text-gray-500 mb-0.5">Converted to {company?.currencyCode}</p>
                <p className="text-xl font-semibold text-primary-400">
                  {company?.currencySymbol}{expense.convertedAmount?.toLocaleString()}
                </p>
                {expense.isApproximateRate && (
                  <p className="text-xs text-amber-500 mt-1">⚠ Approximate exchange rate used</p>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="card space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</h3>
            {[
              { label: "Submitted by", value: expense.submittedBy.name },
              { label: "Category", value: expense.category },
              { label: "Expense Date", value: new Date(expense.expenseDate).toLocaleDateString() },
              { label: "Submitted", value: new Date(expense.createdAt).toLocaleString() },
              { label: "Last Updated", value: new Date(expense.updatedAt).toLocaleString() },
              { label: "Approval Flow", value: expense.activeFlow?.name ?? "None assigned" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-xs text-gray-200 text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Receipt */}
          {expense.receiptUrl && (
            <div className="card">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Receipt</h3>
              <img
                src={`http://localhost:4000${expense.receiptUrl}`}
                alt="Receipt"
                className="w-full rounded-xl object-contain max-h-48 bg-surface-elevated"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <a
                href={`http://localhost:4000${expense.receiptUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost btn btn-sm mt-3 w-full"
              >
                <ExternalLink size={13} /> View Full Receipt
              </a>
            </div>
          )}
        </div>

        {/* Right: Approval Timeline */}
        <div className="lg:col-span-3">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-5">Approval Timeline</h3>
            {expense.activeFlow ? (
              <ApprovalTimeline expense={expense} />
            ) : (
              <div className="empty-state py-8 text-gray-500 text-sm">
                No approval flow assigned
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmResubmit}
        onClose={() => setConfirmResubmit(false)}
        onConfirm={() => resubmitMutation.mutate()}
        isLoading={resubmitMutation.isPending}
        title="Resubmit Expense"
        message="This will reset the approval flow from the beginning and send the expense back for review. Are you sure?"
      />
    </div>
  );
}
