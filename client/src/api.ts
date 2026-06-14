import type { PokemonPage, QueryState } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function buildPokemonUrl(query: QueryState): string {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sort: query.sort,
  });

  if (query.type) {
    params.set("type", query.type);
  }
  if (query.q) {
    params.set("q", query.q);
  }

  return `${API_BASE_URL}/api/pokemon?${params.toString()}`;
}

export async function fetchPokemonPage(
  query: QueryState,
  signal?: AbortSignal,
): Promise<PokemonPage> {
  const response = await fetch(buildPokemonUrl(query), { signal });
  if (!response.ok) {
    throw new Error(`Failed to load Pokemon (${response.status})`);
  }

  return response.json();
}

export async function fetchTypes(signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/types`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load Pokemon types (${response.status})`);
  }

  const payload = (await response.json()) as { types: string[] };
  return payload.types;
}

export async function saveCaptured(id: string, captured: boolean): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/captured`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, captured }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update captured state (${response.status})`);
  }
}
