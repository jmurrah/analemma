import { type RefObject } from "react";
import type { WebKitHTMLVideoElement } from "@/types/dom";

export const useFullscreen = (
  videoRef: RefObject<HTMLVideoElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
) => {
  const handleFullscreen = () => {
    const video = videoRef.current as WebKitHTMLVideoElement | null;
    if (!video) return;

    if (
      "webkitEnterFullscreen" in video &&
      typeof video.webkitEnterFullscreen === "function"
    ) {
      try {
        video.webkitEnterFullscreen();
        return;
      } catch (error) {
        console.error("webkitEnterFullscreen failed:", error);
      }
    }

    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void container.requestFullscreen();
  };

  return { handleFullscreen };
};
