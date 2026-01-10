"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  hasClientFavorites,
  initializeClientFavorites,
  setClientFavorites,
} from "@/features/favorites/stores/favoritesStore";

type FavoritesContextValue = {
  favorites: Set<string>;
  isFavorite: (key: string) => boolean;
  toggleFavorite: (key: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

type FavoritesProviderProps = {
  initialFavorites: string[];
  children: React.ReactNode;
};

export function FavoritesProvider({
  initialFavorites,
  children,
}: FavoritesProviderProps) {
  // Use existing client state if available, otherwise initialize from server
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (hasClientFavorites()) {
      // We already have client-side state from a previous page - use it
      return initializeClientFavorites([]);
    }
    // First load - initialize from server data
    return initializeClientFavorites(initialFavorites);
  });

  const isFavorite = useCallback(
    (key: string) => favorites.has(key),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (key: string) => {
      const currentlyFavorited = favorites.has(key);
      const newFavorited = !currentlyFavorited;

      // Optimistic update - update UI immediately
      setFavorites((prev) => {
        const next = new Set(prev);
        if (newFavorited) {
          next.add(key);
        } else {
          next.delete(key);
        }
        // Sync to global store so it persists across navigations
        setClientFavorites(next);
        return next;
      });

      // Fire API call - don't block UI
      fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, favorite: newFavorited }),
      })
        .then(async (resp) => {
          if (!resp.ok) {
            const text = await resp.text();
            console.error("Toggle failed:", resp.status, text);
            // Revert on failure
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
          // Revert on error
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

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
