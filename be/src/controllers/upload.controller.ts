import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";

export const uploadImage = (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      sendError(res, "No file uploaded", 400);
      return;
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    sendSuccess(res, { imageUrl }, "Image uploaded successfully");
  } catch (error) {
    sendError(res, "Failed to upload image");
  }
};
