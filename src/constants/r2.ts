export const R2_VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm"] as const;

// Only allow videos in the root directory (no folder prefixes)
// Video keys should be like: "20260110_sunset.mp4"
export const R2_ALLOWED_VIDEO_PREFIXES = [""] as const;
