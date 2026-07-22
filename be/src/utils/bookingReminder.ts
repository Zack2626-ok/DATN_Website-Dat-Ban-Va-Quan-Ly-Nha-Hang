import { getBookings } from "./db";
import { notifyWaitersAboutUpcomingBooking } from "./telegram";

const sentReminderBookingIds = new Set<number>();
let reminderTimer: NodeJS.Timeout | null = null;

const getReminderWindowMinutes = (): number => {
  const configuredMinutes = Number(process.env.TELEGRAM_BOOKING_REMINDER_MINUTES || "15");
  return Number.isFinite(configuredMinutes) && configuredMinutes > 0 ? configuredMinutes : 15;
};

const checkUpcomingBookings = async (): Promise<void> => {
  try {
    const reminderWindowMinutes = getReminderWindowMinutes();
    const [pendingBookings, confirmedBookings] = await Promise.all([
      getBookings("pending"),
      getBookings("confirmed"),
    ]);

    for (const booking of [...pendingBookings, ...confirmedBookings]) {
      const bookingId = Number(booking.id);
      const bookingTime = new Date(booking.start_time).getTime();
      const minutesUntilBooking = (bookingTime - Date.now()) / 60_000;

      if (
        !Number.isFinite(bookingId) ||
        Number.isNaN(bookingTime) ||
        sentReminderBookingIds.has(bookingId) ||
        minutesUntilBooking <= 0 ||
        minutesUntilBooking > reminderWindowMinutes
      ) {
        continue;
      }

      await notifyWaitersAboutUpcomingBooking(booking, minutesUntilBooking);
      sentReminderBookingIds.add(bookingId);
    }
  } catch (error) {
    console.error("⚠️ Không thể kiểm tra booking sắp đến giờ:", (error as Error).message);
  }
};

/** Starts the in-process scheduler that checks upcoming bookings once per minute. */
export const startBookingReminderScheduler = (): void => {
  if (reminderTimer) return;

  void checkUpcomingBookings();
  reminderTimer = setInterval(() => void checkUpcomingBookings(), 60_000);
  console.log(`⏰ Đã bật nhắc Telegram trước ${getReminderWindowMinutes()} phút cho booking.`);
};
