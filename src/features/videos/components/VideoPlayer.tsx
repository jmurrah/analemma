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
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const initializeSrc = async () => {
      const cachedUrl = await getCachedVideoBlob(video.key);
      if (cancelled) return;

      const resolved = cachedUrl || video.signedUrl;
      setSrc(resolved);
      setIsReady(true);
      onSourceReady?.(resolved);
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

  const handlePlay = () => {
    if (hasTriggeredCache) return;
    setHasTriggeredCache(true);

    void fetchAndCacheVideo(video.key, video.signedUrl).then((blobUrl) => {
      if (blobUrl.startsWith("blob:")) {
        setSrc(blobUrl);
        onSourceReady?.(blobUrl);
      }
    });
  };

  const togglePlayback = () => {
    const element = videoRef.current;
    if (!element) return;

    if (element.paused) {
      // Check if we need to fetch the cached version
      if (!hasTriggeredCache) {
        // First play - trigger cache and set flag to auto-play when ready
        setShouldAutoPlay(true);
        handlePlay();
      } else {
        // Source is ready, play immediately
        void element.play().catch((error) => {
          console.error("Unable to start playback", error);
        });
      }
    } else {
      element.pause();
    }
  };

  const handleLoadedMetadata = () => {
    const element = videoRef.current;
    if (!element) return;
    setDuration(element.duration || 0);
  };

  const handleCanPlay = () => {
    const element = videoRef.current;
    if (!element) return;

    // If we set the flag to auto-play after loading, do it now
    if (shouldAutoPlay) {
      setShouldAutoPlay(false);
      void element.play().catch((error) => {
        console.error("Unable to start playback", error);
      });
    }
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
          className="block h-full w-full bg-black object-contain cursor-pointer"
          role="button"
          aria-label={isPlaying ? "Pause video" : "Play video"}
          src={src}
          poster={posterImage || undefined}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => {
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          preload="metadata"
          playsInline
          onClick={togglePlayback}
        />
      ) : (
        <div className="h-full w-full" />
      )}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlayback}
            className="pointer-events-auto flex items-center justify-center rounded-full p-4 text-[var(--text)] hover:text-[var(--primary)] cursor-pointer"
            style={{ backgroundColor: "var(--surface2)" }}
            aria-label="Play video"
          >
            <Play size={28} />
          </button>
        )}
      </div>
      <div
        className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-2"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--surface) 80%, transparent) 40%, var(--surface) 100%)",
        }}
      >
        <button
          type="button"
          onClick={togglePlayback}
          className="flex size-10 items-center justify-center rounded-full text-[var(--text)] hover:text-[var(--primary)] cursor-pointer"
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
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
        <button
          type="button"
          onClick={handleFullscreen}
          className="flex size-10 items-center justify-center rounded-full text-[var(--text)] hover:text-[var(--primary)] cursor-pointer"
          aria-label="Toggle fullscreen"
        >
          <Maximize2 size={18} />
        </button>
      </div>
    </div>
  );
}
