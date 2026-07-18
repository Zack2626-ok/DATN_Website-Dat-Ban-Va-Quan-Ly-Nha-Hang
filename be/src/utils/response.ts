import { Response } from "express";
import { ApiResponse } from "./types";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200
): void => {
  const response: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message = "Internal Server Error",
  statusCode = 500
): void => {
  const response: ApiResponse = { success: false, message };
  res.status(statusCode).json(response);
};
