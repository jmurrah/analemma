// Client-side favorites store that persists across page navigations
// This solves the issue where Cloudflare KV is eventually consistent

let clientFavorites: Set<string> | null = null;
let isInitialized = false;

export function getClientFavorites(): Set<string> | null {
  return clientFavorites;
}

export function hasClientFavorites(): boolean {
  return isInitialized;
}

export function initializeClientFavorites(keys: string[]): Set<string> {
  // Only initialize from server data if we haven't been initialized yet
  if (!isInitialized) {
    clientFavorites = new Set(keys);
    isInitialized = true;
  }
  return clientFavorites!;
}

export function setClientFavorites(favorites: Set<string>): void {
  clientFavorites = favorites;
  isInitialized = true;
}

export function addClientFavorite(key: string): void {
  if (clientFavorites) {
    clientFavorites = new Set(clientFavorites);
    clientFavorites.add(key);
  }
}

export function removeClientFavorite(key: string): void {
  if (clientFavorites) {
    clientFavorites = new Set(clientFavorites);
    clientFavorites.delete(key);
  }
}
