import { Request, Response } from "express";
import { getAllCurrencies } from "../services/currency.service";
import { sendError, sendSuccess } from "../utils/response";

// GET /api/currencies
export const getCurrencies = async (_req: Request, res: Response): Promise<void> => {
  try {
    const currencies = await getAllCurrencies();
    sendSuccess(res, currencies);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
