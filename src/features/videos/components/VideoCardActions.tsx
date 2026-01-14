import { ArrowDownToLine, Star } from "lucide-react";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";
import {
  fetchAndCacheVideo,
  getCachedVideoRawBlob,
} from "@/features/videos/utils/videoBlobCache";

type VideoCardActionsProps = {
  video: SignedVideo;
  resolvedSrc: string | null;
  isFavorited: boolean;
  onToggleFavorite: () => void;
};

const ICON_SIZE_MOBILE = 24;

export function VideoCardActions({
  video,
  resolvedSrc,
  isFavorited,
  onToggleFavorite,
}: VideoCardActionsProps) {
  const handleDownload = async () => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        // Check if Web Share API with file support is available
        const hasShareAPI = !!navigator.share && !!navigator.canShare;
        const testFile = new File([], "test.mp4", { type: "video/mp4" });
        const canShareFiles =
          hasShareAPI && navigator.canShare({ files: [testFile] });

        console.log("Share API support:", {
          hasShare: !!navigator.share,
          hasCanShare: !!navigator.canShare,
          canShareFiles,
          hasResolvedSrc: !!resolvedSrc,
        });

        // Sanitize filename - remove any path separators
        const cleanFilename = video.key.split("/").pop() || video.key;

        if (!hasShareAPI) {
          // No Share API at all - show helpful message
          alert(
            "Download not available on this device.\n\n" +
              "To save the video:\n" +
              "1. Tap to play the video\n" +
              "2. Tap the Share button in the video player\n" +
              "3. Choose 'Save Video' or 'Save to Files'",
          );
          return;
        }

        if (!canShareFiles) {
          // Can share URLs but not files - fallback to URL sharing
          try {
            console.log("File sharing not supported, trying URL share");
            await navigator.share({
              url: video.signedUrl,
              title: cleanFilename,
            });
            console.log("URL share completed");
            return;
          } catch (urlShareError) {
            if (
              urlShareError instanceof Error &&
              urlShareError.name !== "AbortError"
            ) {
              console.error("URL share failed:", urlShareError);
              alert(
                "Sharing not available. Play the video and use the share button in the player.",
              );
            }
            return;
          }
        }

        try {
          // Try to get cached blob directly from IndexedDB (fastest, most reliable)
          // This avoids blob URL fetch issues on iOS Safari
          let blob = await getCachedVideoRawBlob(video.key, video.etag);

          if (blob) {
            console.log("Using cached blob from IndexedDB");
          } else {
            // No cache - fetch through proxy
            console.log("Fetching video for share");
            const response = await fetch(video.signedUrl);

            if (!response.ok) {
              throw new Error(`Fetch failed: ${response.status}`);
            }

            blob = await response.blob();
          }

          console.log("Video blob size:", blob.size, "bytes");

          // Check for reasonable size (warn if > 100MB)
          if (blob.size > 100 * 1024 * 1024) {
            console.warn(
              "Large video file, may cause memory issues:",
              blob.size,
            );
          }

          const file = new File([blob], cleanFilename, { type: "video/mp4" });

          await navigator.share({
            files: [file],
            title: cleanFilename,
          });

          console.log("File share completed successfully");
          return;
        } catch (shareError) {
          // User cancelled or share failed
          if (shareError instanceof Error) {
            console.log("Share error:", shareError.name, shareError.message);

            // User cancelled - don't show error
            if (shareError.name === "AbortError") {
              return;
            }

            // User gesture expired - show specific message
            if (shareError.name === "NotAllowedError") {
              alert(
                "Share failed - please try again.\n\n" +
                  "If this keeps happening, play the video and use the share button in the player.",
              );
              return;
            }

            // Other errors
            alert(
              "Failed to share video. Please try again or play the video and use the share button in the player.",
            );
          }
          return;
        }
      }

      // Desktop: use cached blob for efficiency
      const existingUrl = resolvedSrc;
      const downloadUrl =
        existingUrl && existingUrl.startsWith("blob:")
          ? existingUrl
          : await fetchAndCacheVideo(video.key, video.signedUrl, video.etag);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = video.key;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to download video", error);
      alert("Download failed. Please try again.");
    }
  };

  return (
    <div className="flex items-center gap-3 sm:gap-2">
      <button
        type="button"
        onClick={handleDownload}
        className="group rounded cursor-pointer p-2 -m-2 sm:p-0 sm:m-0"
        aria-label="Download video"
      >
        <ArrowDownToLine
          size={ICON_SIZE_MOBILE}
          className="text-[var(--text)] group-hover:text-[var(--primary)] sm:w-[18px] sm:h-[18px]"
        />
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        className="group rounded cursor-pointer p-2 -m-2 sm:p-0 sm:m-0"
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Star
          size={ICON_SIZE_MOBILE}
          className={`sm:w-[18px] sm:h-[18px] ${
            isFavorited
              ? "text-[var(--primary-glow)]"
              : "text-[var(--text)] group-hover:text-[var(--primary-glow)]"
          }`}
          fill={isFavorited ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
}
