import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";
import { parseBookingIntentWithAI } from "../utils/aiBookingAgent";
import { getBookingTimeValidationError } from "../utils/bookingTime";
import { BOOKING_CHANNEL } from "../constants/booking";
import { io } from "../server";
import { notifyWaitersAboutBooking } from "../utils/telegram";

export const getPublicMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await db.getResmanagerMenuItems();
    const categories = await db.getResmanagerCategories();
    // Filter out inactive/deleted items (support both is_active and available columns)
    const activeItems = items.filter((item: any) => {
      const isAvailable = item.available !== undefined ? item.available : item.is_active;
      return isAvailable && !item.is_deleted;
    });
    sendSuccess(res, { items: activeItems, categories }, "Lấy thực đơn công khai thành công.");
  } catch (error) {
    console.error("Error in getPublicMenu:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPublicPromotions = async (req: Request, res: Response): Promise<void> => {
  try {
    const promotions = await db.getPromotions();
    sendSuccess(res, promotions, "Lấy danh sách khuyến mãi thành công.");
  } catch (error) {
    console.error("Error in getPublicPromotions:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPublicHalls = async (req: Request, res: Response): Promise<void> => {
  try {
    const halls = await db.getHalls();
    sendSuccess(res, halls, "Lấy danh sách sảnh tiệc thành công.");
  } catch (error) {
    console.error("Error in getPublicHalls:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPublicEventPackages = async (req: Request, res: Response): Promise<void> => {
  try {
    const packages = await db.getEventPackages();
    sendSuccess(res, packages, "Lấy danh sách set menu tiệc thành công.");
  } catch (error) {
    console.error("Error in getPublicEventPackages:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

/**
 * Handle Public Web AI Chat Widget requests via Gemini 3.6 Flash.
 * Parses natural language, answers questions, extracts booking parameters, auto-allocates tables, and creates bookings.
 */
export const handleAIChatHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, text } = req.body;
    if (!text || typeof text !== "string") {
      sendError(res, "Thiếu tin nhắn text", 400);
      return;
    }

    const conversationHistory = Array.isArray(messages) ? messages : [];
    const aiResult = await parseBookingIntentWithAI(conversationHistory, text);

    if (!aiResult) {
      sendSuccess(
        res,
        {
          reply: "Dạ em là trợ lý AI ResManager. Anh/chị có thể cho em biết ngày giờ và số người anh/chị muốn đặt bàn không ạ?",
          booking_created: false,
        },
        "AI response success"
      );
      return;
    }

    // If complete booking parameters extracted, try allocating table & creating booking
    let bookingCreated = false;
    let createdBookingData = null;

    if (aiResult.is_complete && aiResult.party_size && aiResult.booking_date && aiResult.booking_time && aiResult.guest_name && aiResult.guest_phone) {
      const startTime = `${aiResult.booking_date} ${aiResult.booking_time}:00`;

      // Hard backend validation for online booking time boundaries (Lunch: 10:00-13:45, Dinner: 17:00-20:30)
      const bookingTimeError = getBookingTimeValidationError(startTime, BOOKING_CHANNEL.ONLINE);
      if (bookingTimeError) {
        aiResult.is_complete = false;
        aiResult.reply_prompt = bookingTimeError;
        sendSuccess(
          res,
          {
            reply: bookingTimeError,
            booking_created: false,
            ai_parsed: aiResult,
          },
          "Booking time validation failed"
        );
        return;
      }

      const endTime = `${aiResult.booking_date} ${Number(aiResult.booking_time.slice(0, 2)) + 2}:00:00`;
      let options = await db.getAvailableBookingTableOptions(aiResult.party_size, startTime, endTime);

      // Respect customer's preferred area if specified (e.g. Sân vườn, Tầng 2, Tầng 1)
      if (aiResult.area_preference) {
        const pref = aiResult.area_preference.toLowerCase();
        const matchedOptions = options.filter(opt =>
          opt.tables.some(t => t.area_name?.toLowerCase().includes(pref))
        );
        if (matchedOptions.length > 0) {
          options = matchedOptions;
        }
      }

      if (options.length > 0) {
        const primaryOption = options[0];
        const newBooking = await db.createBooking({
          table_id: primaryOption.primaryTable.id,
          table_ids: primaryOption.tables.map(t => t.id),
          customer_id: null,
          promotion_id: null,
          guest_name: aiResult.guest_name,
          guest_phone: aiResult.guest_phone,
          guest_email: aiResult.guest_email || null,
          party_size: aiResult.party_size,
          start_time: startTime,
          end_time: endTime,
          guest_note: "Đặt qua AI Chat Assistant trên Web",
          note: "Đặt qua AI Chat Assistant trên Web",
          pre_ordered_items: [],
        });

        const fullBooking = await db.getBookingById(newBooking.id);
        bookingCreated = true;
        createdBookingData = fullBooking || newBooking;

        // Socket emit to Waiter/Manager map real-time for ALL allocated tables in group
        io.emit("booking:created", { booking: createdBookingData });
        for (const tbl of primaryOption.tables) {
          io.emit("table:status_changed", {
            tableId: tbl.id,
            status: "reserved",
            guest_name: aiResult.guest_name,
          });
        }

        // Notify Waiters on Telegram
        if (fullBooking) {
          notifyWaitersAboutBooking(fullBooking).catch(err => {
            console.error("Lỗi thông báo Telegram Waiter từ Web AI:", err);
          });
        }
      }
    }

    sendSuccess(
      res,
      {
        reply: aiResult.reply_prompt,
        intent: aiResult,
        booking_created: bookingCreated,
        booking: createdBookingData,
      },
      "Phản hồi AI thành công."
    );
  } catch (error) {
    console.error("Error in handleAIChatHandler:", error);
    sendError(res, `Lỗi AI: ${(error as Error).message}`, 500);
  }
};
