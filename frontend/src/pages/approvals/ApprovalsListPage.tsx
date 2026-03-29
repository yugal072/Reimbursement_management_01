import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock, ArrowRight, AlertCircle } from "lucide-react";
import { expenseApi } from "../../api";
import type {  Expense  } from "../../types";
import { PageLoader } from "../../components/ui/Common";
import { useAuthStore } from "../../store/authStore";

export default function ApprovalsListPage() {
  const { company } = useAuthStore();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => (await expenseApi.getPendingApprovals()).data.data as Expense[],
    refetchInterval: 30_000,
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pending Approvals</h1>
          <p className="page-subtitle">
            {expenses?.length ?? 0} expense{expenses?.length !== 1 ? "s" : ""} awaiting your action
          </p>
        </div>
      </div>

      {expenses?.length === 0 ? (
        <div className="card empty-state">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <Clock size={28} className="text-emerald-400" />
          </div>
          <p className="text-white font-semibold text-lg">All caught up!</p>
          <p className="text-gray-500 text-sm mt-1">No expenses are waiting for your approval</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses!.map(exp => {
            const flow = exp.activeFlow;
            const currentStep = flow?.steps[exp.currentStepIndex];
            const approvedCount = exp.approvalActions.filter(
              a => a.stepId === currentStep?.id && a.action === "APPROVED"
            ).length;
            const totalApprovers = currentStep?.stepApprovers.length ?? 0;
            const isManagerGate = exp.managerApproved === null;

            return (
              <Link
                key={exp.id}
                to={`/approvals/${exp.id}`}
                className="card-hover flex items-start gap-5 cursor-pointer"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={22} className="text-amber-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{exp.description}</p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        by <span className="text-gray-300">{exp.submittedBy.name}</span>
                        {" · "}{exp.category}
                        {" · "}{new Date(exp.expenseDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-white">
                        {company?.currencySymbol}{exp.convertedAmount?.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {exp.amount.toLocaleString()} {exp.currencyCode}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    {isManagerGate ? (
                      <span className="text-amber-400 font-medium">🔑 Manager gate — your approval needed</span>
                    ) : currentStep ? (
                      <>
                        <span>Step {exp.currentStepIndex + 1}: <span className="text-gray-300">{currentStep.label}</span></span>
                        <span className="text-gray-600">·</span>
                        <span>{approvedCount}/{totalApprovers} approved</span>
                        <span className="text-gray-600">·</span>
                        <span>Rule: <span className="text-gray-300">{currentStep.ruleType}</span></span>
                      </>
                    ) : null}
                  </div>
                </div>

                <ArrowRight size={16} className="text-gray-600 flex-shrink-0 mt-1" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
