import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ORDER_TYPE } from "../constants/order";
import {
  SHIFT_TIME_ERROR_CODE,
  WALK_IN_OVERRIDE_ROLES,
} from "../constants/shiftTime";
import { validateOnlineBookingTime, validateWalkInOpeningTime } from "../utils/shiftHelper";
import { isBookingTimeValidationEnabled } from "../utils/bookingTime";

/** Sends an error response whose shape is stable for all time-policy failures. */
const sendTimePolicyError = (res: Response, code: string, message: string): void => {
  res.status(400).json({ success: false, code, message });
};

/** Returns the HH:mm section of a supported local booking datetime value. */
const getBookingClock = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/(?:T|\s)(\d{2}:\d{2})(?::\d{2})?$/);
  return match?.[1] ?? null;
};

/** Prevents customer bookings whose requested serving time is outside the online service windows. */
export const checkOnlineBookingTimeMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!isBookingTimeValidationEnabled()) {
    next();
    return;
  }
  const bookingClock = getBookingClock(req.body.start_time);
  if (!bookingClock) {
    next();
    return;
  }
  if (!validateOnlineBookingTime(bookingClock)) {
    sendTimePolicyError(
      res,
      SHIFT_TIME_ERROR_CODE.BOOKING_TIME_OUT_OF_BOUND,
      "Đặt bàn online chỉ nhận ca trưa 10:00–13:45 và ca tối 17:00–20:30.",
    );
    return;
  }
  next();
};

/** Blocks normal waiter walk-ins after the restaurant's service cut-off while allowing audited manager overrides. */
export const checkWalkInOpeningTimeMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!isBookingTimeValidationEnabled()) {
    next();
    return;
  }
  if (req.body.order_type === ORDER_TYPE.PRE_ORDER) {
    next();
    return;
  }

  const roleName = String(req.user?.role ?? req.user?.role_name ?? "").toLowerCase();
  const isOverrideRole = WALK_IN_OVERRIDE_ROLES.includes(roleName as (typeof WALK_IN_OVERRIDE_ROLES)[number]);
  if (isOverrideRole) {
    console.info(`[walk-in-override] user=${req.user?.userId ?? "unknown"} role=${roleName}`);
    next();
    return;
  }

  if (!validateWalkInOpeningTime(new Date())) {
    sendTimePolicyError(
      res,
      SHIFT_TIME_ERROR_CODE.WALK_IN_TIME_EXCEEDED,
      "Chỉ được mở bàn trực tiếp từ 10:00–14:00 hoặc 17:00–21:00.",
    );
    return;
  }
  next();
};
