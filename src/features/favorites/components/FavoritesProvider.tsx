"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getClientFavorites,
  initializeClientFavorites,
  setClientFavorites,
} from "@/features/favorites/stores/favoritesStore";

export type FavoritesContextValue = {
  favorites: Set<string>;
  isFavorite: (key: string) => boolean;
  toggleFavorite: (key: string) => void;
};

export const FavoritesContext = createContext<FavoritesContextValue | null>(
  null,
);

type FavoritesProviderProps = {
  initialFavorites: string[];
  children: React.ReactNode;
};

export function FavoritesProvider({
  initialFavorites,
  children,
}: FavoritesProviderProps) {
  // Always use initialFavorites on first render to ensure server/client match
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(initialFavorites),
  );

  // After hydration, sync with client-side cache if it exists
  useEffect(() => {
    const cached = getClientFavorites();
    if (cached) {
      setFavorites(cached);
    } else {
      initializeClientFavorites(initialFavorites);
    }
  }, [initialFavorites]);

  const isFavorite = useCallback(
    (key: string) => favorites.has(key),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (key: string) => {
      const currentlyFavorited = favorites.has(key);
      const newFavorited = !currentlyFavorited;

      setFavorites((prev) => {
        const next = new Set(prev);
        if (newFavorited) {
          next.add(key);
        } else {
          next.delete(key);
        }
        setClientFavorites(next);
        return next;
      });

      fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, favorite: newFavorited }),
      })
        .then(async (resp) => {
          if (!resp.ok) {
            const text = await resp.text();
            console.error("Toggle failed:", resp.status, text);
            setFavorites((prev) => {
              const reverted = new Set(prev);
              if (newFavorited) {
                reverted.delete(key);
              } else {
                reverted.add(key);
              }
              setClientFavorites(reverted);
              return reverted;
            });
          }
        })
        .catch((err) => {
          console.error("Toggle error:", err);
          setFavorites((prev) => {
            const reverted = new Set(prev);
            if (newFavorited) {
              reverted.delete(key);
            } else {
              reverted.add(key);
            }
            setClientFavorites(reverted);
            return reverted;
          });
        });
    },
    [favorites],
  );

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite }),
    [favorites, isFavorite, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}
