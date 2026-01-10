export type FavoritesListResponse = {
  keys: string[];
  cursor: string | null;
  listComplete: boolean;
};

export type FavoritesApiResponse = {
  favorites: string[];
  cursor: string | null;
  listComplete: boolean;
};

export type ToggleFavoriteRequest = {
  key: string;
  favorite: boolean;
};

export type ToggleFavoriteResponse = {
  key: string;
  favorited: boolean;
  updatedAt: string;
};
