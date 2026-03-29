import type { ApprovalAction, ApprovalFlowStep, Expense } from "../types";
import { CheckCircle2, Clock, Lock, UserCheck, AlertTriangle } from "lucide-react";
import { RuleTypeBadge } from "./ui/Badges";

interface ApprovalTimelineProps {
  expense: Expense;
}

function getStepStatus(expense: Expense, stepIndex: number): "completed" | "active" | "locked" {
  if (stepIndex < expense.currentStepIndex) return "completed";
  if (stepIndex === expense.currentStepIndex && expense.status === "PENDING") return "active";
  return "locked";
}

function StepIcon({ status }: { status: "completed" | "active" | "locked" }) {
  if (status === "completed") return <CheckCircle2 size={20} className="text-emerald-400" />;
  if (status === "active") return <Clock size={20} className="text-amber-400 animate-pulse-subtle" />;
  return <Lock size={20} className="text-gray-600" />;
}

function getProgressLabel(step: ApprovalFlowStep, actions: ApprovalAction[]): string {
  const approved = actions.filter(a => a.stepId === step.id && a.action === "APPROVED").length;
  const total = step.stepApprovers.length;
  if (step.ruleType === "ALL") return `${approved}/${total} approved`;
  if (step.ruleType === "PERCENTAGE") return `${approved}/${total} (need ${step.percentageThreshold}%)`;
  if (step.ruleType === "SPECIFIC") return `Waiting for key approver`;
  if (step.ruleType === "HYBRID") return `${approved}/${total} or key approver`;
  return `${approved}/${total}`;
}

export default function ApprovalTimeline({ expense }: ApprovalTimelineProps) {
  const flow = expense.activeFlow;
  const actions = expense.approvalActions;

  // Manager gate check
  const managerGateAction = actions.find(a => a.isManagerGate);
  const hasManagerGate = expense.managerApproved !== undefined && expense.managerApproved !== undefined;
  const managerGateRequired = expense.managerApproved === null || managerGateAction;

  return (
    <div className="space-y-0">
      {/* Manager Gate */}
      {managerGateRequired && (
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${managerGateAction?.action === "APPROVED"
              ? "border-emerald-500 bg-emerald-500/10"
              : managerGateAction?.action === "REJECTED"
                ? "border-red-500 bg-red-500/10"
                : "border-amber-500 bg-amber-500/10"
              }`}>
              <UserCheck size={16} className={
                managerGateAction?.action === "APPROVED" ? "text-emerald-400" :
                  managerGateAction?.action === "REJECTED" ? "text-red-400" : "text-amber-400"
              } />
            </div>
            {flow && flow.steps.length > 0 && (
              <div className="w-0.5 h-6 bg-surface-border mt-1" />
            )}
          </div>
          <div className="pb-6 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-white">Manager Approval Gate</p>
              <span className={`badge text-xs ${managerGateAction?.action === "APPROVED" ? "badge-approved" :
                managerGateAction?.action === "REJECTED" ? "badge-rejected" : "badge-pending"
                }`}>
                {managerGateAction?.action ?? "Pending"}
              </span>
            </div>
            {managerGateAction ? (
              <p className="text-xs text-gray-400">
                {managerGateAction.actor.name} · {new Date(managerGateAction.createdAt).toLocaleDateString()}
                {managerGateAction.comment && ` · "${managerGateAction.comment}"`}
              </p>
            ) : (
              <p className="text-xs text-gray-500">Waiting for manager to act</p>
            )}
          </div>
        </div>
      )}

      {/* Flow steps */}
      {flow?.steps.map((step, idx) => {
        const status = getStepStatus(expense, idx);
        const stepActions = actions.filter(a => a.stepId === step.id);
        const approvedActions = stepActions.filter(a => a.action === "APPROVED");
        const rejectedActions = stepActions.filter(a => a.action === "REJECTED");
        const isLast = idx === flow.steps.length - 1;

        return (
          <div key={step.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${status === "completed"
                ? "border-emerald-500 bg-emerald-500/10"
                : status === "active"
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-surface-border bg-surface-elevated"
                }`}>
                <StepIcon status={status} />
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-surface-border mt-1 mb-0 min-h-6" />}
            </div>

            <div className={`pb-6 flex-1 ${isLast ? "" : ""}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-semibold ${status === "active" ? "text-white" :
                    status === "completed" ? "text-emerald-300" : "text-gray-500"
                    }`}>
                    Step {idx + 1}: {step.label}
                  </p>
                  <RuleTypeBadge type={step.ruleType} />
                </div>
                <span className={`badge text-xs flex-shrink-0 ${status === "completed" ? "badge-approved" :
                  status === "active" ? "badge-pending" : "badge-draft"
                  }`}>
                  {status === "completed" ? "Done" : status === "active" ? "Active" : "Locked"}
                </span>
              </div>

              {/* Approvers list */}
              <div className="space-y-1.5">
                {step.stepApprovers.map(sa => {
                  const acted = stepActions.find(a => a.actorId === sa.userId);
                  return (
                    <div key={sa.userId} className="flex items-center gap-2 text-xs">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${acted?.action === "APPROVED" ? "bg-emerald-500/20 text-emerald-400" :
                        acted?.action === "REJECTED" ? "bg-red-500/20 text-red-400" :
                          "bg-surface-elevated text-gray-500"
                        }`}>
                        {sa.user.name.charAt(0)}
                      </div>
                      <span className={acted ? "text-gray-300" : "text-gray-500"}>{sa.user.name}</span>
                      {acted && (
                        <span className={acted.action === "APPROVED" ? "text-emerald-400" : "text-red-400"}>
                          · {acted.action} {new Date(acted.createdAt).toLocaleDateString()}
                          {acted.comment && ` · "${acted.comment}"`}
                        </span>
                      )}
                      {sa.userId === step.keyApproverId && (
                        <span className="text-violet-400">★ key</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {status === "active" && (
                <p className="text-xs text-amber-400/70 mt-2">
                  {getProgressLabel(step, actions)}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Final status */}
      {(expense.status === "APPROVED" || expense.status === "REJECTED") && (
        <div className="flex gap-4">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${expense.status === "APPROVED" ? "border-emerald-500 bg-emerald-500/10" : "border-red-500 bg-red-500/10"
            }`}>
            {expense.status === "APPROVED"
              ? <CheckCircle2 size={18} className="text-emerald-400" />
              : <AlertTriangle size={18} className="text-red-400" />}
          </div>
          <div className="pt-1">
            <p className={`text-sm font-semibold ${expense.status === "APPROVED" ? "text-emerald-400" : "text-red-400"}`}>
              {expense.status === "APPROVED" ? "✅ Fully Approved" : "❌ Rejected"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
