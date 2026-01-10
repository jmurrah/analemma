"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFavoritesManager } from "@/features/videos/hooks/useFavoritesManager";
import type { R2VideoObject } from "@/types/infra/r2";

type LoadState = "idle" | "loading" | "loaded" | "error";

type VideoListResponse = {
  items: R2VideoObject[];
};

type SignedUrlResponse = {
  url: string;
  expiresAt: string;
};

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
};

const formatSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) {
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  }
  return `${mb.toFixed(1)} MB`;
};

const fetchVideoList = async (): Promise<VideoListResponse> => {
  const resp = await fetch("/api/videos", { cache: "force-cache" });
  if (!resp.ok) throw new Error(`Failed to load videos: ${resp.status}`);
  return resp.json();
};

const signVideoUrl = async (key: string): Promise<SignedUrlResponse> => {
  const resp = await fetch(`/api/videos/sign?key=${encodeURIComponent(key)}`, {
    cache: "no-store",
  });
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(
      `Failed to sign video (${resp.status}): ${errorText || "unknown error"}`,
    );
  }
  return resp.json();
};

export default function VideoGallery() {
  const [videos, setVideos] = useState<R2VideoObject[]>([]);
  const [listState, setListState] = useState<LoadState>("idle");
  const [listError, setListError] = useState<string | null>(null);
  const [showLovedOnly, setShowLovedOnly] = useState(false);

  const {
    effectiveFavorites,
    favoritesError,
    favoritesState,
    isPending,
    toggleFavorite,
    refreshServerFavorites,
  } = useFavoritesManager();

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const retriedRef = useRef(false);
  const currentKeyRef = useRef<string | null>(null);

  const loadVideos = useCallback(async () => {
    setListState("loading");
    setListError(null);
    try {
      const data = await fetchVideoList();
      setVideos(data.items);
      setListState("loaded");
    } catch (error) {
      setListState("error");
      setListError(error instanceof Error ? error.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    void loadVideos();
    void refreshServerFavorites();
  }, [loadVideos, refreshServerFavorites]);

  const requestSignedUrl = useCallback(async (key: string) => {
    setActiveKey(key);
    setSigning(true);
    setSignError(null);
    setSignedUrl(null);
    retriedRef.current = false;
    currentKeyRef.current = key;
    try {
      const signed = await signVideoUrl(key);
      if (currentKeyRef.current !== key) return;
      setSignedUrl(signed.url);
      setActiveKey(key);
    } catch (error) {
      if (currentKeyRef.current !== key) return;
      setSignError(
        error instanceof Error ? error.message : "Failed to sign URL",
      );
      setSignedUrl(null);
      setActiveKey(key);
    } finally {
      if (currentKeyRef.current === key) {
        setSigning(false);
      }
    }
  }, []);

  const handleVideoError = useCallback(() => {
    if (!activeKey) return;
    if (retriedRef.current) {
      setSignError("Playback failed. Please try again later.");
      return;
    }
    retriedRef.current = true;
    void requestSignedUrl(activeKey);
  }, [activeKey, requestSignedUrl]);

  const visibleVideos = useMemo(() => {
    if (!showLovedOnly) return videos;
    return videos.filter((v) => effectiveFavorites.has(v.key));
  }, [effectiveFavorites, showLovedOnly, videos]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl">Videos</h2>
          {listState === "loading" ? <span>Loading...</span> : null}
          {listError ? <span className="text-red-500">{listError}</span> : null}
          {favoritesState === "loading" ? (
            <span className="text-sm text-[var(--text-muted)]">
              Loading favorites...
            </span>
          ) : null}
          {favoritesError ? (
            <span className="text-sm text-red-500">{favoritesError}</span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {visibleVideos.length === 0 && listState === "loaded" ? (
          <p>No videos available.</p>
        ) : null}
        {visibleVideos.map((video) => {
          const isFav = effectiveFavorites.has(video.key);
          const pending = isPending(video.key);
          return (
            <div
              key={video.key}
              className="w-full flex flex-col gap-1 border p-2 rounded"
            >
              <div className="w-full flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="text-left flex-1"
                  onClick={() => requestSignedUrl(video.key)}
                  disabled={signing && activeKey === video.key}
                >
                  <span className="font-medium">{video.key}</span>
                  <span className="block text-sm text-[var(--text-muted)]">
                    {formatDateTime(video.lastModified)} -{" "}
                    {formatSize(video.size)}
                  </span>
                </button>
                <button
                  type="button"
                  className="text-xl px-2"
                  onClick={() => toggleFavorite(video.key)}
                  aria-pressed={isFav}
                  aria-label={isFav ? "Unlove" : "Love"}
                  disabled={pending && favoritesState === "loading"}
                >
                  {isFav ? "★" : "☆"}
                </button>
              </div>
              {pending ? (
                <span className="text-xs text-[var(--text-muted)]">
                  Syncing favorite...
                </span>
              ) : null}
              {signing && activeKey === video.key ? (
                <span className="text-xs text-[var(--text-muted)]">
                  Signing...
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xl">{activeKey ?? "Select a video"}</h3>
        {signError ? <p className="text-red-500 text-sm">{signError}</p> : null}
        {signedUrl ? (
          <video
            key={signedUrl}
            src={signedUrl}
            controls
            className="w-full"
            onError={handleVideoError}
            autoPlay
          />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Select a video to start playback.
          </p>
        )}
      </div>
    </div>
  );
}
