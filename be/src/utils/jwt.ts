import jwt from "jsonwebtoken";
import { JwtPayload } from "./types";

// ✅ Bắt buộc phải có JWT_SECRET, không có thì crash ngay khi khởi động
const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("JWT_SECRET is not defined in .env");

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, SECRET) as JwtPayload;
};
