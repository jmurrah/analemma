import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FavoritesApiResponse } from "@/types/api/favorites";
import type { OverlayEntry } from "@/features/videos/types/overlay";
import {
  overlayConstants,
  readOverlay,
  updateOverlay,
} from "@/features/videos/utils/favoritesOverlay";

type LoadState = "idle" | "loading" | "loaded" | "error";

type FavoritesState = {
  effectiveFavorites: Set<string>;
  favoritesState: LoadState;
  favoritesError: string | null;
  isPending: (key: string) => boolean;
  toggleFavorite: (key: string) => Promise<void>;
  refreshServerFavorites: () => Promise<void>;
};

const FAVORITES_RECONCILE_DELAY_MS = 1_500;

const fetchFavorites = async (): Promise<FavoritesApiResponse> => {
  const resp = await fetch("/api/favorites", { cache: "no-store" });
  if (!resp.ok) throw new Error(`Failed to load favorites: ${resp.status}`);
  return resp.json();
};

export const useFavoritesManager = (): FavoritesState => {
  const [serverFavorites, setServerFavorites] = useState<Set<string>>(
    new Set(),
  );
  const serverFavoritesRef = useRef<Set<string>>(new Set());
  const [overlay, setOverlay] = useState<Map<string, OverlayEntry>>(new Map());
  const [favoritesState, setFavoritesState] = useState<LoadState>("idle");
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  const overlayRef = useRef<Map<string, OverlayEntry>>(overlay);
  const reconcileTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconcileTokens = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    overlayRef.current = overlay;
  }, [overlay]);

  const refreshServerFavorites = useCallback(async () => {
    setFavoritesState("loading");
    setFavoritesError(null);
    try {
      const data = await fetchFavorites();
      const next = new Set(data.favorites);
      setServerFavorites(next);
      serverFavoritesRef.current = next;
      setFavoritesState("loaded");
    } catch (error) {
      setFavoritesState("error");
      setFavoritesError(
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }, []);

  useEffect(() => {
    setOverlay(readOverlay());
    void refreshServerFavorites();
    return () => {
      if (reconcileTimeout.current) {
        clearTimeout(reconcileTimeout.current);
      }
    };
  }, [refreshServerFavorites]);

  const effectiveFavorites = useMemo(() => {
    const merged = new Set(serverFavorites);
    overlay.forEach((entry, key) => {
      if (entry.desired) merged.add(key);
      else merged.delete(key);
    });
    return merged;
  }, [overlay, serverFavorites]);

  const reconcileFavoritesSoon = useCallback(() => {
    if (reconcileTimeout.current) {
      clearTimeout(reconcileTimeout.current);
    }
    reconcileTimeout.current = setTimeout(() => {
      void refreshServerFavorites();
    }, FAVORITES_RECONCILE_DELAY_MS);
  }, [refreshServerFavorites]);

  const updateOverlayState = useCallback(
    (mutator: (draft: Map<string, OverlayEntry>) => void) => {
      setOverlay((prev) => updateOverlay(prev, mutator));
    },
    [],
  );

  const reconcileFavorite = useCallback(
    async (key: string, desired: boolean, attempt = 0) => {
      const token = (reconcileTokens.current.get(key) ?? 0) + 1;
      reconcileTokens.current.set(key, token);

      const backoffMs = Math.min(8_000, 1_000 * 2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      if (reconcileTokens.current.get(key) !== token) return;

      const entry = overlayRef.current.get(key);
      if (!entry || entry.desired !== desired) return;

      const now = Date.now();
      if (now - entry.updatedAt > overlayConstants.ttlMs) {
        updateOverlayState((draft) => draft.delete(key));
        return;
      }

      await refreshServerFavorites();
      if (reconcileTokens.current.get(key) !== token) return;

      const matches = serverFavoritesRef.current.has(key) === desired;
      if (matches) {
        updateOverlayState((draft) => draft.delete(key));
        return;
      }

      if (now - entry.updatedAt > overlayConstants.ttlMs) {
        updateOverlayState((draft) => draft.delete(key));
        return;
      }

      void reconcileFavorite(key, desired, attempt + 1);
    },
    [refreshServerFavorites, serverFavorites, updateOverlayState],
  );

  const toggleFavorite = useCallback(
    async (key: string) => {
      const currentlyFav = effectiveFavorites.has(key);
      const desired = !currentlyFav;
      const now = Date.now();

      updateOverlayState((draft) => {
        const prev = draft.get(key);
        draft.set(key, {
          desired,
          updatedAt: now,
          status: "pending",
          attempts: (prev?.attempts ?? 0) + 1,
        });
      });
      setFavoritesError(null);

      try {
        const resp = await fetch("/api/favorites/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, favorite: desired }),
        });
        if (!resp.ok) {
          throw new Error(`Toggle failed: ${resp.status}`);
        }
        reconcileFavoritesSoon();
        void reconcileFavorite(key, desired, 0);
      } catch (error) {
        updateOverlayState((draft) => draft.delete(key));
        setFavoritesError(
          error instanceof Error ? error.message : "Failed to update favorite",
        );
      }
    },
    [
      effectiveFavorites,
      reconcileFavorite,
      reconcileFavoritesSoon,
      updateOverlayState,
    ],
  );

  const isPending = useCallback(
    (key: string) => {
      const entry = overlay.get(key);
      return Boolean(
        entry && Date.now() - entry.updatedAt <= overlayConstants.ttlMs,
      );
    },
    [overlay],
  );

  return {
    effectiveFavorites,
    favoritesState,
    favoritesError,
    isPending,
    toggleFavorite,
    refreshServerFavorites,
  };
};
