import { create } from "zustand";

interface FavoritesState {
  items: [];
}

export const useFavoritesStore = create<FavoritesState>(() => ({
  items: []
}));
