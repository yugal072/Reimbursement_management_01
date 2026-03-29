import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { sanitizeUser, sendError, sendSuccess } from "../utils/response";

// GET /api/users
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.user.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
        isManagerApprover: true,
        createdAt: true,
        manager: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    sendSuccess(res, users);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// POST /api/users
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, managerId, isManagerApprover } = req.body;
    const { companyId } = req.user;

    if (!name || !email || !password || !role) {
      sendError(res, "name, email, password and role are required", 400);
      return;
    }

    if (!["EMPLOYEE", "MANAGER"].includes(role)) {
      sendError(res, "Role must be EMPLOYEE or MANAGER", 400);
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, "Email already registered", 409);
      return;
    }

    // Validate managerId belongs to same company
    if (managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerId, companyId },
      });
      if (!manager) {
        sendError(res, "Manager not found in your company", 400);
        return;
      }
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        managerId: managerId || null,
        isManagerApprover: isManagerApprover ?? false,
        companyId,
      },
    });

    sendSuccess(res, sanitizeUser(user), 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// PATCH /api/users/:id
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role, managerId, isManagerApprover, name } = req.body;
    const { companyId } = req.user;

    const existing = await prisma.user.findFirst({ where: { id, companyId } });
    if (!existing) {
      sendError(res, "User not found", 404);
      return;
    }

    // Prevent changing own role
    if (id === req.user.userId && role && role !== existing.role) {
      sendError(res, "You cannot change your own role", 403);
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (managerId !== undefined) updateData.managerId = managerId || null;
    if (isManagerApprover !== undefined) updateData.isManagerApprover = isManagerApprover;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    sendSuccess(res, sanitizeUser(user));
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    if (id === req.user.userId) {
      sendError(res, "You cannot delete yourself", 403);
      return;
    }

    const existing = await prisma.user.findFirst({ where: { id, companyId } });
    if (!existing) {
      sendError(res, "User not found", 404);
      return;
    }

    await prisma.user.delete({ where: { id } });
    sendSuccess(res, { message: "User deleted successfully" });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
