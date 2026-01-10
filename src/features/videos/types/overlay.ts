export type OverlayEntry = {
  desired: boolean;
  updatedAt: number;
  status: "pending" | "confirmed";
  attempts: number;
};
