"use client";

import { useEffect, useRef, useState } from "react";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";
import { getCachedVideoBlob } from "@/features/videos/utils/videoBlobCache";
import { generatePosterFromVideo } from "@/features/videos/utils/generatePoster";
import { VideoPlayButton } from "@/features/videos/components/VideoPlayButton";
import { VideoControls } from "@/features/videos/components/VideoControls";
import { useVideoPlayback } from "@/features/videos/hooks/useVideoPlayback";
import { useFullscreen } from "@/features/videos/hooks/useFullscreen";

type VideoPlayerProps = {
  video: SignedVideo;
  onSourceReady?: (src: string) => void;
};

export function VideoPlayer({ video, onSourceReady }: VideoPlayerProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasTriggeredCache, setHasTriggeredCache] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { togglePlayback, handleLoadedMetadata, handleTimeUpdate, handleSeek } =
    useVideoPlayback({
      videoRef,
      video,
      hasTriggeredCache,
      setHasTriggeredCache,
      setDuration,
      setCurrentTime,
    });

  const { handleFullscreen } = useFullscreen(videoRef, containerRef);

  useEffect(() => {
    let cancelled = false;

    const initializeSrc = async () => {
      try {
        const cachedUrl = await getCachedVideoBlob(video.key, video.etag);
        if (cancelled) return;

        const resolved = cachedUrl || video.signedUrl;
        setSrc(resolved);
        setIsReady(true);
        onSourceReady?.(resolved);
      } catch (error) {
        console.error("Failed to initialize video src:", error);
        if (!cancelled) {
          setSrc(video.signedUrl);
          setIsReady(true);
          onSourceReady?.(video.signedUrl);
        }
      }
    };

    void initializeSrc();

    return () => {
      cancelled = true;
    };
  }, [onSourceReady, video.key, video.signedUrl, video.etag]);

  useEffect(() => {
    if (!src || !src.startsWith("blob:") || !isReady || duration === 0) {
      return;
    }

    let cancelled = false;

    const generatePoster = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (cancelled) return;

        const response = await fetch(src);
        const blob = await response.blob();
        if (cancelled) return;

        const poster = await generatePosterFromVideo(blob);
        if (cancelled) return;

        if (poster) {
          setPosterImage(poster);
        }
      } catch (error) {
        console.error("Failed to generate poster:", error);
      }
    };

    void generatePoster();

    return () => {
      cancelled = true;
    };
  }, [src, isReady, duration]);

  useEffect(() => {
    const currentSrc = src;
    return () => {
      if (currentSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(currentSrc);
      }
    };
  }, []);

  const isVideoReady = posterImage || hasLoadedData;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black"
      style={{ aspectRatio: "16 / 9" }}
    >
      <video
        ref={videoRef}
        className="block h-full w-full bg-black object-contain"
        src={src || undefined}
        poster={posterImage || undefined}
        onLoadedMetadata={handleLoadedMetadata}
        onLoadedData={() => setHasLoadedData(true)}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={(e) => {
          const videoElement = e.currentTarget;
          console.error("Video error:", {
            code: videoElement.error?.code,
            message: videoElement.error?.message,
            src: src,
          });

          // If blob URL failed, fallback to proxy URL
          if (src?.startsWith("blob:")) {
            console.log("Blob URL failed, falling back to proxy URL");
            setSrc(video.signedUrl);
            setHasLoadedData(false);
          }
        }}
        preload="metadata"
        playsInline
        style={{
          opacity: isVideoReady ? 1 : 0,
          pointerEvents: isVideoReady ? "auto" : "none",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 cursor-pointer"
        style={{ bottom: "56px", transform: "translateZ(1px)" }}
        onPointerUp={togglePlayback}
        role="button"
        tabIndex={0}
        aria-label={isPlaying ? "Pause video" : "Play video"}
      />

      <VideoPlayButton onPlay={togglePlayback} isPlaying={isPlaying} />

      <VideoControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onTogglePlayback={togglePlayback}
        onSeek={handleSeek}
        onFullscreen={handleFullscreen}
      />
    </div>
  );
}
