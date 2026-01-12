"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Maximize2, Pause, Play } from "lucide-react";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";
import {
  getCachedVideoBlob,
  fetchAndCacheVideo,
} from "@/features/videos/utils/videoBlobCache";
import { generatePosterFromVideo } from "@/features/videos/utils/generatePoster";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const initializeSrc = async () => {
      try {
        const cachedUrl = await getCachedVideoBlob(video.key);
        if (cancelled) return;

        const resolved = cachedUrl || video.signedUrl;
        // Add #t=0.001 fragment to hint Safari to load first frame
        const srcWithFragment = resolved.includes("#")
          ? resolved
          : `${resolved}#t=0.001`;
        setSrc(srcWithFragment);
        setIsReady(true);
        onSourceReady?.(resolved);
      } catch (error) {
        console.error("Failed to initialize video src:", error);
        // Fallback to signed URL on error
        if (!cancelled) {
          const fallbackSrc = video.signedUrl.includes("#")
            ? video.signedUrl
            : `${video.signedUrl}#t=0.001`;
          setSrc(fallbackSrc);
          setIsReady(true);
          onSourceReady?.(video.signedUrl);
        }
      }
    };

    void initializeSrc();

    return () => {
      cancelled = true;
    };
  }, [onSourceReady, video.key, video.signedUrl]);

  // Generate poster image when we have a blob URL
  useEffect(() => {
    if (!src || !src.startsWith("blob:")) {
      return;
    }

    let cancelled = false;

    const generatePoster = async () => {
      try {
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
  }, [src]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (src?.startsWith("blob:")) {
        URL.revokeObjectURL(src);
      }
    };
  }, [src]);

  const togglePlayback = () => {
    const element = videoRef.current;
    if (!element) return;

    if (element.paused) {
      // Trigger caching in background for future use (but don't switch src mid-playback)
      if (!hasTriggeredCache) {
        setHasTriggeredCache(true);
        void fetchAndCacheVideo(video.key, video.signedUrl);
      }

      // Play immediately from current src
      void element.play().catch((error) => {
        console.error("Unable to start playback", error);
      });
    } else {
      element.pause();
    }
  };

  const handleLoadedMetadata = () => {
    const element = videoRef.current;
    if (!element) return;
    setDuration(element.duration || 0);
  };

  const handleTimeUpdate = () => {
    const element = videoRef.current;
    if (!element) return;
    setCurrentTime(element.currentTime);
  };

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const element = videoRef.current;
    if (!element) return;

    const newTime = Number(event.target.value);
    element.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void container.requestFullscreen();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black"
      style={{ aspectRatio: "16 / 9" }}
    >
      {isReady && src ? (
        <video
          ref={videoRef}
          className="block h-full w-full bg-black object-contain"
          src={src}
          poster={posterImage || undefined}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => {
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            console.error("Video error:", e);
            // Try to recover by using signed URL
            if (src.startsWith("blob:")) {
              const fallbackSrc = video.signedUrl.includes("#")
                ? video.signedUrl
                : `${video.signedUrl}#t=0.001`;
              setSrc(fallbackSrc);
            }
          }}
          preload="metadata"
          playsInline
        />
      ) : (
        <div className="h-full w-full" />
      )}
      {/* Click-to-play overlay - stops before control bar */}
      <div
        className="absolute inset-x-0 top-0 cursor-pointer"
        style={{ bottom: "56px" }}
        onClick={togglePlayback}
        role="button"
        tabIndex={0}
        aria-label={isPlaying ? "Pause video" : "Play video"}
      />

      {/* Center play button */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 20 }}
        >
          <div
            onClick={togglePlayback}
            className="pointer-events-auto flex items-center justify-center rounded-full p-4 text-[var(--text)] hover:text-[var(--primary)] cursor-pointer"
            style={{ backgroundColor: "var(--surface2)" }}
            role="button"
            tabIndex={0}
            aria-label="Play video"
          >
            <Play size={28} />
          </div>
        </div>
      )}

      {/* Control bar */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-2"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--surface) 80%, transparent) 40%, var(--surface) 100%)",
          zIndex: 20,
        }}
      >
        <div
          onClick={togglePlayback}
          className="flex shrink-0 items-center justify-center rounded-full text-[var(--text)] hover:text-[var(--primary)] cursor-pointer"
          style={{
            width: "40px",
            height: "40px",
          }}
          role="button"
          tabIndex={0}
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full cursor-pointer"
          style={{ accentColor: "var(--primary)" }}
        />
        <div
          onClick={handleFullscreen}
          className="flex shrink-0 items-center justify-center rounded-full text-[var(--text)] hover:text-[var(--primary)] cursor-pointer"
          style={{
            width: "40px",
            height: "40px",
          }}
          role="button"
          tabIndex={0}
          aria-label="Toggle fullscreen"
        >
          <Maximize2 size={18} />
        </div>
      </div>
    </div>
  );
}
