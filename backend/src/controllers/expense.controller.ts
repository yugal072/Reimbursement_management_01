import { Request, Response } from "express";
import path from "path";
import prisma from "../lib/prisma";
import { convertCurrency } from "../services/currency.service";
import { processApprovalAction, requiresManagerGate } from "../services/approval.service";
import { sendError, sendSuccess } from "../utils/response";

const expenseInclude = {
  submittedBy: { select: { id: true, name: true, email: true, role: true } },
  company: { select: { id: true, name: true, currencyCode: true, currencySymbol: true } },
  activeFlow: {
    include: {
      steps: {
        orderBy: { stepIndex: "asc" as const },
        include: {
          stepApprovers: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          keyApprover: { select: { id: true, name: true, email: true } },
        },
      },
    },
  },
  approvalActions: {
    orderBy: { createdAt: "asc" as const },
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
      step: true,
    },
  },
};

// ─── POST /api/expenses ───────────────────────────────────────────────────────
export const submitExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currencyCode, category, description, expenseDate } = req.body;
    const { userId, companyId } = req.user;
    const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!amount || !currencyCode || !category || !description || !expenseDate) {
      sendError(res, "amount, currencyCode, category, description, expenseDate are required", 400);
      return;
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) { sendError(res, "Company not found", 404); return; }

    // Convert currency
    const { convertedAmount, isApproximate } = await convertCurrency(
      parseFloat(amount),
      currencyCode,
      company.currencyCode
    );

    // Get default approval flow
    const defaultFlow = await prisma.approvalFlow.findFirst({
      where: { companyId, isDefault: true },
      include: { steps: { orderBy: { stepIndex: "asc" } } },
    }) ?? await prisma.approvalFlow.findFirst({
      where: { companyId },
      include: { steps: { orderBy: { stepIndex: "asc" } } },
    });

    // Check manager gate
    const managerId = await requiresManagerGate(userId);

    const expense = await prisma.expense.create({
      data: {
        companyId,
        submittedById: userId,
        amount: parseFloat(amount),
        currencyCode,
        convertedAmount,
        category,
        description,
        expenseDate: new Date(expenseDate),
        receiptUrl,
        status: "PENDING",
        currentStepIndex: 0,
        activeFlowId: defaultFlow?.id ?? null,
        isApproximateRate: isApproximate,
        managerApproved: managerId ? null : undefined, // null = gate required, undefined = no gate
      },
      include: expenseInclude,
    });

    sendSuccess(res, { expense, requiresManagerApproval: !!managerId, managerId }, 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// ─── GET /api/expenses/mine ───────────────────────────────────────────────────
export const getMyExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { submittedById: req.user.userId },
      include: expenseInclude,
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, expenses);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// ─── GET /api/expenses/pending-approvals ─────────────────────────────────────
export const getPendingApprovals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, companyId, role } = req.user;

    // Find all steps where this user is an approver
    const stepApprovers = await prisma.stepApprover.findMany({
      where: { userId },
      select: { stepId: true },
    });
    const stepIds = stepApprovers.map((sa) => sa.stepId);

    // All pending expenses in company
    const allPending = await prisma.expense.findMany({
      where: { companyId, status: "PENDING" },
      include: expenseInclude,
    });

    const result = allPending.filter((exp) => {
      // Check manager gate
      if (exp.managerApproved === null) {
        // Gate required — check if this user is the manager
        const managerGateAction = exp.approvalActions.find(a => a.isManagerGate);
        if (!managerGateAction) {
          // No action yet on manager gate — check if I'm the manager
          return false; // handled separately in front-end by checking submitter's managerId
        }
        return false;
      }

      const currentStep = exp.activeFlow?.steps[exp.currentStepIndex];
      if (!currentStep) return false;

      // Check if this user is assigned to current step
      const isApproverForStep = stepIds.includes(currentStep.id);
      if (!isApproverForStep) return false;

      // Check user hasn't already acted on this step
      const alreadyActed = exp.approvalActions.some(
        (a) => a.actorId === userId && a.stepId === currentStep.id
      );
      return !alreadyActed;
    });

    // Also fetch expenses where this user is the required manager approver
    const managerGateExpenses = await prisma.expense.findMany({
      where: {
        companyId,
        status: "PENDING",
        managerApproved: null,
        submittedBy: { managerId: userId },
      },
      include: expenseInclude,
    });

    // Filter out duplicates
    const managerGateFiltered = managerGateExpenses.filter(
      (e) => !result.find((r) => r.id === e.id)
    );

    sendSuccess(res, [...managerGateFiltered, ...result]);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// ─── GET /api/expenses ────────────────────────────────────────────────────────
export const getAllExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const where: any = { companyId: req.user.companyId };
    if (status) where.status = status;

    const expenses = await prisma.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, expenses);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// ─── GET /api/expenses/:id ────────────────────────────────────────────────────
export const getExpenseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const expense = await prisma.expense.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: expenseInclude,
    });
    if (!expense) { sendError(res, "Expense not found", 404); return; }
    sendSuccess(res, expense);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// ─── POST /api/expenses/:id/action ───────────────────────────────────────────
export const takeApprovalAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, comment, isManagerGate } = req.body;
    const { id: expenseId } = req.params;
    const { userId, companyId } = req.user;

    if (!["APPROVED", "REJECTED"].includes(action)) {
      sendError(res, "action must be APPROVED or REJECTED", 400);
      return;
    }

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, companyId },
      include: {
        submittedBy: { include: { manager: true } },
        activeFlow: {
          include: {
            steps: {
              orderBy: { stepIndex: "asc" },
              include: { stepApprovers: true },
            },
          },
        },
      },
    });

    if (!expense) { sendError(res, "Expense not found", 404); return; }
    if (expense.status !== "PENDING") { sendError(res, "Expense is not pending", 400); return; }

    // Manager gate action
    if (isManagerGate || expense.managerApproved === null) {
      const submitter = expense.submittedBy;
      if (submitter.managerId !== userId) {
        sendError(res, "You are not the manager for this expense", 403);
        return;
      }
      const result = await processApprovalAction(expenseId, userId, null, action, comment);
      sendSuccess(res, result);
      return;
    }

    // Regular step action — verify authorized
    const currentStep = expense.activeFlow?.steps[expense.currentStepIndex];
    if (!currentStep) { sendError(res, "No active step found", 400); return; }

    const isAuthorized = currentStep.stepApprovers.some((sa) => sa.userId === userId);
    if (!isAuthorized) { sendError(res, "Not authorized for this approval step", 403); return; }

    const alreadyActed = await prisma.approvalAction.findFirst({
      where: { expenseId, stepId: currentStep.id, actorId: userId },
    });
    if (alreadyActed) { sendError(res, "You have already acted on this step", 400); return; }

    const result = await processApprovalAction(
      expenseId,
      userId,
      currentStep.id,
      action,
      comment
    );
    sendSuccess(res, result);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// ─── POST /api/expenses/:id/override (Admin) ──────────────────────────────────
export const overrideExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, comment } = req.body;
    const { id: expenseId } = req.params;
    const { userId, companyId } = req.user;

    if (!["APPROVED", "REJECTED"].includes(action)) {
      sendError(res, "action must be APPROVED or REJECTED", 400);
      return;
    }

    const expense = await prisma.expense.findFirst({ where: { id: expenseId, companyId } });
    if (!expense) { sendError(res, "Expense not found", 404); return; }

    await prisma.approvalAction.create({
      data: { expenseId, actorId: userId, action, comment, isManagerGate: false },
    });

    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: action === "APPROVED" ? "APPROVED" : "REJECTED" },
    });

    sendSuccess(res, { result: `ADMIN_${action}` });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// ─── POST /api/expenses/:id/resubmit ─────────────────────────────────────────
export const resubmitExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: expenseId } = req.params;
    const { userId, companyId } = req.user;

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, companyId, submittedById: userId },
    });

    if (!expense) { sendError(res, "Expense not found", 404); return; }
    if (expense.status !== "REJECTED") { sendError(res, "Only rejected expenses can be resubmitted", 400); return; }

    // Delete old approval actions
    await prisma.approvalAction.deleteMany({ where: { expenseId } });

    // Check manager gate again
    const managerId = await requiresManagerGate(userId);

    await prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: "PENDING",
        currentStepIndex: 0,
        managerApproved: managerId ? null : undefined,
      },
    });

    const updated = await prisma.expense.findUnique({ where: { id: expenseId }, include: expenseInclude });
    sendSuccess(res, updated);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
