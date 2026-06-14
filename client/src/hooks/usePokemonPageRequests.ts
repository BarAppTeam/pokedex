import { useRef } from "react";
import { fetchPokemonPage } from "../api";
import { queryKey } from "../queryState";
import type { PokemonPage, QueryState } from "../types";

interface RequestPageOptions {
  force?: boolean;
  signal?: AbortSignal;
}

export interface PokemonPageRequests {
  cachedPagesForQuery: (query: QueryState) => Map<number, PokemonPage>;
  clearPages: () => void;
  deletePendingPage: (query: QueryState, page: number) => void;
  getCachedPage: (query: QueryState, page: number) => PokemonPage | undefined;
  requestPage: (
    query: QueryState,
    page: number,
    options?: RequestPageOptions,
  ) => Promise<PokemonPage>;
  updateCachedCapturedState: (
    id: string,
    captured: boolean,
    mergeCapturedState: (items: PokemonPage["items"], id: string, captured: boolean) => PokemonPage["items"],
  ) => void;
}

export function usePokemonPageRequests(): PokemonPageRequests {
  const pageCacheRef = useRef<Map<string, PokemonPage>>(new Map());
  const pendingPageRequestsRef = useRef<Map<string, Promise<PokemonPage>>>(new Map());

  function getCachedPage(query: QueryState, page: number): PokemonPage | undefined {
    return pageCacheRef.current.get(pageCacheKey(query, page));
  }

  function cachedPagesForQuery(query: QueryState): Map<number, PokemonPage> {
    const keyPrefix = `${queryKey(query)}::`;
    const pages = new Map<number, PokemonPage>();
    pageCacheRef.current.forEach((pageResult, key) => {
      if (key.startsWith(keyPrefix)) {
        pages.set(pageResult.page, pageResult);
      }
    });
    return pages;
  }

  function clearPages(): void {
    pageCacheRef.current.clear();
    pendingPageRequestsRef.current.clear();
  }

  function deletePendingPage(query: QueryState, page: number): void {
    pendingPageRequestsRef.current.delete(pageCacheKey(query, page));
  }

  function requestPage(
    sourceQuery: QueryState,
    page: number,
    options: RequestPageOptions = {},
  ): Promise<PokemonPage> {
    const key = pageCacheKey(sourceQuery, page);
    if (!options.force) {
      const cachedPage = pageCacheRef.current.get(key);
      if (cachedPage) {
        return Promise.resolve(cachedPage);
      }

      const pendingRequest = pendingPageRequestsRef.current.get(key);
      if (pendingRequest) {
        return pendingRequest;
      }
    }

    const request = fetchPokemonPage({ ...sourceQuery, page }, options.signal)
      .then((pageResult) => {
        pageCacheRef.current.set(key, pageResult);
        return pageResult;
      })
      .finally(() => {
        if (pendingPageRequestsRef.current.get(key) === request) {
          pendingPageRequestsRef.current.delete(key);
        }
      });
    pendingPageRequestsRef.current.set(key, request);
    return request;
  }

  function updateCachedCapturedState(
    id: string,
    captured: boolean,
    mergeCapturedState: (items: PokemonPage["items"], id: string, captured: boolean) => PokemonPage["items"],
  ): void {
    pageCacheRef.current.forEach((pageResult, key) => {
      const nextItems = mergeCapturedState(pageResult.items, id, captured);
      if (nextItems !== pageResult.items) {
        pageCacheRef.current.set(key, { ...pageResult, items: nextItems });
      }
    });
  }

  return {
    cachedPagesForQuery,
    clearPages,
    deletePendingPage,
    getCachedPage,
    requestPage,
    updateCachedCapturedState,
  };
}

export function pageCacheKey(query: QueryState, page: number): string {
  return `${queryKey(query)}::${page}`;
}
