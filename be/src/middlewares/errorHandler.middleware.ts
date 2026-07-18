import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";

export interface ApiError extends Error {
  statusCode?: number;
}

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[ERROR] ${statusCode} - ${message}`);
  sendError(res, message, statusCode);
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  sendError(res, "Endpoint not found", 404);
};

/**
 * Async Error Wrapper - Wraps async route handlers to catch errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
