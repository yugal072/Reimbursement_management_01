import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { signToken } from "../utils/jwt";
import { getCurrencyForCountry } from "../services/currency.service";
import { sanitizeUser, sendError, sendSuccess } from "../utils/response";

// POST /api/auth/signup
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, companyName, country } = req.body;

    if (!name || !email || !password || !companyName || !country) {
      sendError(res, "All fields are required", 400);
      return;
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, "Email already registered", 409);
      return;
    }

    // Fetch country currency
    const { currencyCode, currencySymbol } = await getCurrencyForCountry(country);

    // Create Company
    const company = await prisma.company.create({
      data: { name: companyName, country, currencyCode, currencySymbol },
    });

    // Hash password & create Admin user
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
        companyId: company.id,
      },
    });

    const token = signToken({ userId: user.id, role: user.role, companyId: company.id });
    sendSuccess(res, { token, user: sanitizeUser(user), company }, 201);
  } catch (err: any) {
    sendError(res, err.message || "Signup failed", 500);
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, "Email and password are required", 400);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      sendError(res, "Invalid email or password", 401);
      return;
    }

    const token = signToken({ userId: user.id, role: user.role, companyId: user.companyId });
    sendSuccess(res, { token, user: sanitizeUser(user), company: user.company });
  } catch (err: any) {
    sendError(res, err.message || "Login failed", 500);
  }
};

// GET /api/auth/me
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { company: true, manager: { select: { id: true, name: true, email: true } } },
    });

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    sendSuccess(res, sanitizeUser(user));
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch user", 500);
  }
};
