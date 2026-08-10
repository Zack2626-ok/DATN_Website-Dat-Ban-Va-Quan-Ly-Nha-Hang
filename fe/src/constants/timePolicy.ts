/** Restaurant time rules shared by the shift-management display. */
export const TIME_POLICY = {
  LUNCH_SHIFT: "10:00 – 15:00",
  DINNER_SHIFT: "17:00 – 22:00",
  BREAK: "15:01 – 16:59",
  ONLINE_BOOKING: "10:00 – 13:45 và 17:00 – 20:30",
  WALK_IN: "10:00 – 14:00 và 17:00 – 21:00",
  ATTENDANCE_GRACE: "15 phút",
} as const;
