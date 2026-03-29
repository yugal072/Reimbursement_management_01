import prisma from "../lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApprovalFlowStepWithApprovers {
  id: string;
  flowId: string;
  stepIndex: number;
  label: string;
  ruleType: string;
  percentageThreshold: number | null;
  keyApproverId: string | null;
  stepApprovers: { userId: string }[];
}

// ─── Evaluate Step Rule ───────────────────────────────────────────────────────
export const evaluateStepRule = async (
  expenseId: string,
  step: ApprovalFlowStepWithApprovers
): Promise<boolean> => {
  const actions = await prisma.approvalAction.findMany({
    where: {
      expenseId,
      stepId: step.id,
      action: "APPROVED",
    },
  });

  const approvedUserIds = actions.map((a) => a.actorId);
  const totalApprovers = step.stepApprovers.length;

  switch (step.ruleType) {
    case "ALL":
      return step.stepApprovers.every((sa) =>
        approvedUserIds.includes(sa.userId)
      );

    case "PERCENTAGE": {
      const pct = totalApprovers > 0 ? (approvedUserIds.length / totalApprovers) * 100 : 0;
      return pct >= (step.percentageThreshold ?? 100);
    }

    case "SPECIFIC":
      return step.keyApproverId
        ? approvedUserIds.includes(step.keyApproverId)
        : false;

    case "HYBRID": {
      const hybridPct = totalApprovers > 0 ? (approvedUserIds.length / totalApprovers) * 100 : 0;
      const percentageMet = hybridPct >= (step.percentageThreshold ?? 100);
      const specificMet = step.keyApproverId
        ? approvedUserIds.includes(step.keyApproverId)
        : false;
      return percentageMet || specificMet;
    }

    default:
      return false;
  }
};

// ─── Manager Gate: Check if gate is needed ────────────────────────────────────
export const requiresManagerGate = async (submitterId: string): Promise<string | null> => {
  const submitter = await prisma.user.findUnique({
    where: { id: submitterId },
    include: { manager: true },
  });

  if (submitter?.managerId && submitter.manager?.isManagerApprover) {
    return submitter.managerId;
  }
  return null;
};

// ─── Manager Gate: Check if manager has approved ──────────────────────────────
export const hasManagerApproved = async (expenseId: string): Promise<boolean> => {
  const action = await prisma.approvalAction.findFirst({
    where: {
      expenseId,
      isManagerGate: true,
    },
  });
  return action?.action === "APPROVED";
};

// ─── Process Approval Action ──────────────────────────────────────────────────
export const processApprovalAction = async (
  expenseId: string,
  actorId: string,
  stepId: string | null, // null = manager gate
  action: "APPROVED" | "REJECTED",
  comment?: string
): Promise<{
  result: string;
  nextStep?: string;
}> => {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      activeFlow: {
        include: {
          steps: {
            orderBy: { stepIndex: "asc" },
            include: {
              stepApprovers: true,
            },
          },
        },
      },
    },
  });

  if (!expense) throw new Error("Expense not found");
  if (expense.status !== "PENDING") throw new Error("Expense is not in PENDING state");

  // Record the action
  await prisma.approvalAction.create({
    data: {
      expenseId,
      stepId,
      actorId,
      action,
      comment,
      isManagerGate: stepId === null,
    },
  });

  // If rejected → finalize immediately
  if (action === "REJECTED") {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: "REJECTED" },
    });
    return { result: "REJECTED" };
  }

  // If this is the manager gate
  if (stepId === null) {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { managerApproved: true },
    });

    // Check if there are any flow steps; if not, expense is approved
    const flowSteps = expense.activeFlow?.steps ?? [];
    if (flowSteps.length === 0) {
      await prisma.expense.update({
        where: { id: expenseId },
        data: { status: "APPROVED" },
      });
      return { result: "APPROVED" };
    }

    // Advance to first flow step
    const firstStep = flowSteps[0];
    return { result: "ADVANCED_TO_FLOW", nextStep: firstStep.label };
  }

  // Regular step action
  const steps = expense.activeFlow?.steps ?? [];
  const currentStep = steps[expense.currentStepIndex];

  if (!currentStep || currentStep.id !== stepId) {
    throw new Error("Actor is not authorized for the current step");
  }

  const isStepComplete = await evaluateStepRule(expenseId, currentStep);

  if (!isStepComplete) {
    return { result: "AWAITING_MORE_APPROVALS" };
  }

  // Advance to next step
  const nextStepIndex = expense.currentStepIndex + 1;
  const totalSteps = steps.length;

  if (nextStepIndex >= totalSteps) {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: "APPROVED" },
    });
    return { result: "APPROVED" };
  }

  await prisma.expense.update({
    where: { id: expenseId },
    data: { currentStepIndex: nextStepIndex },
  });

  const nextStep = steps[nextStepIndex];
  return { result: "ADVANCED_TO_NEXT_STEP", nextStep: nextStep.label };
};
