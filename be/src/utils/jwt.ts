import "dotenv/config";

import jwt from "jsonwebtoken";
import { JwtPayload } from "./types";

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in .env");
  }

  return secret;
};

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, getSecret(), { expiresIn: "7d" });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, getSecret()) as JwtPayload;
};