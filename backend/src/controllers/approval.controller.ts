import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { sendError, sendSuccess } from "../utils/response";

// POST /api/approval-flows
export const createApprovalFlow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, isDefault, steps } = req.body;
    const { companyId } = req.user;

    if (!name || !Array.isArray(steps) || steps.length === 0) {
      sendError(res, "name and at least one step are required", 400);
      return;
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.approvalFlow.updateMany({
        where: { companyId },
        data: { isDefault: false },
      });
    }

    const flow = await prisma.approvalFlow.create({
      data: {
        name,
        description,
        companyId,
        isDefault: isDefault ?? false,
        steps: {
          create: steps.map((step: any) => ({
            stepIndex: step.stepIndex,
            label: step.label,
            ruleType: step.ruleType || "ALL",
            percentageThreshold: step.percentageThreshold ?? null,
            keyApproverId: step.keyApproverId ?? null,
            stepApprovers: {
              create: (step.approverIds || []).map((userId: string) => ({ userId })),
            },
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepIndex: "asc" },
          include: {
            stepApprovers: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            keyApprover: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    sendSuccess(res, flow, 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// GET /api/approval-flows
export const getApprovalFlows = async (req: Request, res: Response): Promise<void> => {
  try {
    const flows = await prisma.approvalFlow.findMany({
      where: { companyId: req.user.companyId },
      include: {
        steps: {
          orderBy: { stepIndex: "asc" },
          include: {
            stepApprovers: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            keyApprover: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { expenses: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    sendSuccess(res, flows);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// GET /api/approval-flows/:id
export const getApprovalFlowById = async (req: Request, res: Response): Promise<void> => {
  try {
    const flow = await prisma.approvalFlow.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: {
        steps: {
          orderBy: { stepIndex: "asc" },
          include: {
            stepApprovers: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            keyApprover: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!flow) { sendError(res, "Flow not found", 404); return; }
    sendSuccess(res, flow);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// PUT /api/approval-flows/:id
export const updateApprovalFlow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, isDefault, steps } = req.body;
    const { companyId } = req.user;

    const existing = await prisma.approvalFlow.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) { sendError(res, "Flow not found", 404); return; }

    if (isDefault) {
      await prisma.approvalFlow.updateMany({
        where: { companyId },
        data: { isDefault: false },
      });
    }

    // Delete old steps and recreate
    await prisma.stepApprover.deleteMany({
      where: { step: { flowId: req.params.id } },
    });
    await prisma.approvalFlowStep.deleteMany({ where: { flowId: req.params.id } });

    const flow = await prisma.approvalFlow.update({
      where: { id: req.params.id },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
        isDefault: isDefault ?? existing.isDefault,
        steps: {
          create: (steps || []).map((step: any) => ({
            stepIndex: step.stepIndex,
            label: step.label,
            ruleType: step.ruleType || "ALL",
            percentageThreshold: step.percentageThreshold ?? null,
            keyApproverId: step.keyApproverId ?? null,
            stepApprovers: {
              create: (step.approverIds || []).map((userId: string) => ({ userId })),
            },
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepIndex: "asc" },
          include: {
            stepApprovers: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    });

    sendSuccess(res, flow);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// DELETE /api/approval-flows/:id
export const deleteApprovalFlow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.user;
    const existing = await prisma.approvalFlow.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) { sendError(res, "Flow not found", 404); return; }

    // Check if any expenses use it
    const inUse = await prisma.expense.count({ where: { activeFlowId: req.params.id } });
    if (inUse > 0) {
      sendError(res, "Cannot delete a flow that is currently in use by expenses", 400);
      return;
    }

    await prisma.approvalFlow.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: "Flow deleted" });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// POST /api/approval-flows/:id/set-default
export const setDefaultFlow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.user;
    await prisma.approvalFlow.updateMany({ where: { companyId }, data: { isDefault: false } });
    const flow = await prisma.approvalFlow.update({
      where: { id: req.params.id },
      data: { isDefault: true },
    });
    sendSuccess(res, flow);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
