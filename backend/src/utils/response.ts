import { Response } from "express";

export const sendSuccess = (
  res: Response,
  data: unknown,
  statusCode = 200
) => {
  return res.status(statusCode).json({ success: true, data });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400
) => {
  return res.status(statusCode).json({ success: false, message });
};

export const sanitizeUser = (user: any) => {
  const { password, ...rest } = user;
  return rest;
};
