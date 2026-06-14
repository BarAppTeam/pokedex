import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import { saveCaptured } from "../api";
import { queryKey } from "../queryState";
import type { Pokemon, PokemonPage, QueryState } from "../types";
import { usePokemonPageRequests } from "./usePokemonPageRequests";
import {
  getContiguousVisiblePages as selectContiguousVisiblePages,
  getWarmPageNumbers,
  usePokemonPageWindow,
} from "./usePokemonPageWindow";
import { usePokemonScrollPaging } from "./usePokemonScrollPaging";

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

export const emptyMeta: PageMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
};

export function usePokemonPages(
  query: QueryState,
  setQuery: Dispatch<SetStateAction<QueryState>>,
) {
  const [items, setItems] = useState<Pokemon[]>([]);
  const [visiblePages, setVisiblePages] = useState<PokemonPage[]>([]);
  const [meta, setMeta] = useState<PageMeta>(emptyMeta);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setCaptureSavingVersion] = useState(0);
  const captureSavingIdsRef = useRef<Set<string>>(new Set());
  const currentQueryKey = queryKey(query);
  const currentQueryRef = useRef(query);
  const previousQueryKeyRef = useRef(currentQueryKey);
  const pageRequests = usePokemonPageRequests();
  const {
    bottomSpacerHeight,
    measurementVersion,
    pageElementsRef,
    registerPageWindow,
    resetPageWindow,
    topSpacerHeight,
  } = usePokemonPageWindow(visiblePages, meta.totalPages);
  const { alignOnNextRender, resetScrollPaging } = usePokemonScrollPaging({
    currentQueryKey,
    isLoading,
    measurementVersion,
    meta,
    pageElementsRef,
    query,
    setQuery,
    visiblePages,
  });

  currentQueryRef.current = query;

  useEffect(() => {
    if (previousQueryKeyRef.current === currentQueryKey) {
      return;
    }

    previousQueryKeyRef.current = currentQueryKey;
    resetScrollPaging();
    pageRequests.clearPages();
    resetPageWindow();
    setItems([]);
    setVisiblePages([]);
    setMeta({ ...emptyMeta, page: query.page, pageSize: query.pageSize });
  }, [currentQueryKey, query.page, query.pageSize]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPage() {
      const cachedPage = pageRequests.getCachedPage(query, query.page);
      if (cachedPage) {
        setIsLoading(true);
        setError(null);
        showPage(cachedPage, query);
        prefetchWindowPages(cachedPage, query);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const pageResult = await pageRequests.requestPage(query, query.page, {
          force: cachedPage !== undefined,
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          return;
        }

        if (
          !controller.signal.aborted &&
          query.page > pageResult.totalPages &&
          pageResult.totalPages > 0 &&
          pageResult.items.length === 0
        ) {
          alignOnNextRender();
          setQuery((previous) => ({
            ...previous,
            page: pageResult.totalPages,
          }));
          return;
        }

        showPage(pageResult, query);
        prefetchWindowPages(pageResult, query);
      } catch (nextError) {
        if (nextError instanceof Error && nextError.name !== "AbortError") {
          setError(nextError.message);
          setItems([]);
          setVisiblePages([]);
          setMeta({ ...emptyMeta, page: query.page, pageSize: query.pageSize });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      controller.abort();
      pageRequests.deletePendingPage(query, query.page);
    };
  }, [query, setQuery]);

  function updateControl(nextValues: Partial<Omit<QueryState, "page">>): void {
    setItems([]);
    setVisiblePages([]);
    setMeta({ ...emptyMeta, pageSize: nextValues.pageSize ?? query.pageSize });
    resetScrollPaging();
    setQuery((previous) => ({ ...previous, ...nextValues, page: 1 }));
  }

  async function toggleCaptured(pokemon: Pokemon): Promise<void> {
    if (captureSavingIdsRef.current.has(pokemon.id)) {
      return;
    }

    const nextCaptured = !pokemon.captured;
    setCaptureSaving(pokemon.id, true);
    setItems((previousItems) =>
      mergeCapturedState(previousItems, pokemon.id, nextCaptured),
    );
    setVisiblePages((previousPages) =>
      mergeCapturedStateInPages(previousPages, pokemon.id, nextCaptured),
    );
    updateCachedCapturedState(pokemon.id, nextCaptured);

    try {
      await saveCaptured(pokemon.id, nextCaptured);
    } catch {
      setItems((previousItems) =>
        mergeCapturedState(previousItems, pokemon.id, pokemon.captured),
      );
      setVisiblePages((previousPages) =>
        mergeCapturedStateInPages(previousPages, pokemon.id, pokemon.captured),
      );
      updateCachedCapturedState(pokemon.id, pokemon.captured);
      setError("Could not save captured state. Please try again.");
    } finally {
      setCaptureSaving(pokemon.id, false);
    }
  }

  function setCaptureSaving(id: string, isSaving: boolean): void {
    const savingIds = captureSavingIdsRef.current;
    if (savingIds.has(id) === isSaving) {
      return;
    }

    if (isSaving) {
      savingIds.add(id);
    } else {
      savingIds.delete(id);
    }

    setCaptureSavingVersion((version) => version + 1);
  }

  function showPage(pageResult: PokemonPage, sourceQuery: QueryState): void {
    setItems(pageResult.items);
    setMeta(metaFromPage(pageResult));
    syncVisiblePages(sourceQuery, pageResult);
  }

  function prefetchWindowPages(
    pageResult: PokemonPage,
    sourceQuery: QueryState,
  ): void {
    getWarmPageNumbers(pageResult.page, pageResult.totalPages).forEach(
      (page) => {
        pageRequests
          .requestPage(sourceQuery, page)
          .then(() => {
            const activeQuery = currentQueryRef.current;
            if (queryKey(activeQuery) !== queryKey(sourceQuery)) {
              return;
            }

            const activePage = pageRequests.getCachedPage(
              activeQuery,
              activeQuery.page,
            );
            if (activePage) {
              syncVisiblePages(activeQuery, activePage);
            }
          })
          .catch(handlePrefetchFailure);
      },
    );
  }

  function updateCachedCapturedState(id: string, captured: boolean): void {
    pageRequests.updateCachedCapturedState(id, captured, mergeCapturedState);
  }

  function syncVisiblePages(
    sourceQuery: QueryState,
    centerPage: PokemonPage,
  ): void {
    setVisiblePages(getContiguousVisiblePages(sourceQuery, centerPage));
  }

  function getContiguousVisiblePages(
    sourceQuery: QueryState,
    centerPage: PokemonPage,
  ): PokemonPage[] {
    return selectContiguousVisiblePages(
      pageRequests.cachedPagesForQuery(sourceQuery),
      centerPage,
    );
  }

  return {
    items,
    visiblePages,
    topSpacerHeight,
    bottomSpacerHeight,
    captureSavingIds: captureSavingIdsRef.current,
    meta,
    isLoading,
    error,
    registerPageWindow,
    updateControl,
    toggleCaptured,
  };
}

function handlePrefetchFailure(error: unknown): void {
  if (error instanceof Error && error.name === "AbortError") {
    return;
  }

  console.debug("Pokemon page prefetch failed", error);
}

function metaFromPage(pageResult: PokemonPage): PageMeta {
  return {
    page: pageResult.page,
    pageSize: pageResult.pageSize,
    total: pageResult.total,
    totalPages: pageResult.totalPages,
    hasNext: pageResult.hasNext,
  };
}

function mergeCapturedState(
  items: Pokemon[],
  id: string,
  captured: boolean,
): Pokemon[] {
  let changed = false;
  const nextItems = items.map((pokemon) => {
    if (pokemon.id !== id) {
      return pokemon;
    }

    changed = true;
    return { ...pokemon, captured };
  });

  return changed ? nextItems : items;
}

function mergeCapturedStateInPages(
  pages: PokemonPage[],
  id: string,
  captured: boolean,
): PokemonPage[] {
  let changed = false;
  const nextPages = pages.map((pageResult) => {
    const nextItems = mergeCapturedState(pageResult.items, id, captured);
    if (nextItems === pageResult.items) {
      return pageResult;
    }

    changed = true;
    return { ...pageResult, items: nextItems };
  });

  return changed ? nextPages : pages;
}
