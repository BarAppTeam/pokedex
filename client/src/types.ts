export type SortOrder = "asc" | "desc";
export type ThemeMode = "light" | "dark";

export interface Pokemon {
  id: string;
  number: number;
  name: string;
  displayName: string;
  type_one: string;
  type_two: string;
  total: number;
  hit_points: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
  generation: number;
  legendary: boolean;
  captured: boolean;
  imageUrl: string;
}

export interface PokemonPage {
  items: Pokemon[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  sort: SortOrder;
  type: string;
  q: string;
}

export interface QueryState {
  page: number;
  pageSize: number;
  sort: SortOrder;
  type: string;
  q: string;
}
