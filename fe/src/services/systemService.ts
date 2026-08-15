import axiosInstance from "./axiosInstance";

export interface BookingValidationStatusResponse {
  enabled: boolean;
}

export const getBookingValidationStatus = async (): Promise<boolean> => {
  try {
    const response = await axiosInstance.get("/v1/system-settings/booking-validation");
    return Boolean(response.data?.data?.enabled);
  } catch (error) {
    console.error("Error fetching booking validation status:", error);
    return true;
  }
};

export const updateBookingValidationStatus = async (enabled: boolean): Promise<boolean> => {
  const response = await axiosInstance.post("/v1/system-settings/booking-validation", { enabled });
  return Boolean(response.data?.data?.enabled);
};
