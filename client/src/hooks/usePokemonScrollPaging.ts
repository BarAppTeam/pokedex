import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { queryKey } from "../queryState";
import type { PokemonPage, QueryState } from "../types";
import {
  getPageAnchorElement,
  getPageBounds,
  WARM_PAGE_RADIUS,
} from "./usePokemonPageWindow";

type PageAnchor = {
  page: number;
  top: number;
};

interface ScrollPagingMeta {
  totalPages: number;
}

interface PokemonScrollPagingOptions {
  currentQueryKey: string;
  isLoading: boolean;
  measurementVersion: number;
  meta: ScrollPagingMeta;
  pageElementsRef: MutableRefObject<Map<number, HTMLElement>>;
  query: QueryState;
  setQuery: Dispatch<SetStateAction<QueryState>>;
  visiblePages: PokemonPage[];
}

export interface PokemonScrollPaging {
  alignOnNextRender: () => void;
  resetScrollPaging: () => void;
}

export function usePokemonScrollPaging({
  currentQueryKey,
  isLoading,
  measurementVersion,
  meta,
  pageElementsRef,
  query,
  setQuery,
  visiblePages,
}: PokemonScrollPagingOptions): PokemonScrollPaging {
  const scrollDirectionRef = useRef<"up" | "down">("down");
  const hasUserScrolledRef = useRef(false);
  const previousScrollYRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const currentQueryRef = useRef(query);
  const shouldAlignCurrentPageRef = useRef(true);
  const pendingAnchorRef = useRef<PageAnchor | null>(null);

  currentQueryRef.current = query;

  const alignOnNextRender = useCallback(() => {
    shouldAlignCurrentPageRef.current = true;
  }, []);

  const resetScrollPaging = useCallback(() => {
    shouldAlignCurrentPageRef.current = true;
    pendingAnchorRef.current = null;
  }, []);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;
      if (currentScrollY > previousScrollYRef.current) {
        scrollDirectionRef.current = "down";
      } else if (currentScrollY < previousScrollYRef.current) {
        scrollDirectionRef.current = "up";
      }
      previousScrollYRef.current = currentScrollY;
    }

    function handleWheel(event: WheelEvent) {
      hasUserScrolledRef.current = true;
      if (event.deltaY > 0) {
        scrollDirectionRef.current = "down";
      } else if (event.deltaY < 0) {
        scrollDirectionRef.current = "up";
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (["ArrowDown", "PageDown", " ", "End"].includes(event.key)) {
        hasUserScrolledRef.current = true;
        scrollDirectionRef.current = "down";
      } else if (["ArrowUp", "PageUp", "Home"].includes(event.key)) {
        hasUserScrolledRef.current = true;
        scrollDirectionRef.current = "up";
      }
    }

    function handleTouchStart(event: TouchEvent) {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    }

    function handleTouchMove(event: TouchEvent) {
      const startY = touchStartYRef.current;
      const currentY = event.touches[0]?.clientY;
      if (startY === null || currentY === undefined || startY === currentY) {
        return;
      }

      hasUserScrolledRef.current = true;
      scrollDirectionRef.current = currentY < startY ? "down" : "up";
      touchStartYRef.current = currentY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  useEffect(() => {
    const pageElements = visiblePages
      .map((pageResult) => pageElementsRef.current.get(pageResult.page))
      .map((element) => (element ? getPageAnchorElement(element) : null))
      .filter((element): element is HTMLElement => element !== null);

    if (pageElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || isLoading || !hasUserScrolledRef.current) {
            continue;
          }

          const nextPage = getObservedPage(entry.target);
          if (!Number.isInteger(nextPage) || nextPage === query.page) {
            continue;
          }

          if (
            scrollDirectionRef.current === "down"
            && nextPage > query.page
            && nextPage <= meta.totalPages
          ) {
            hasUserScrolledRef.current = false;
            shouldAlignCurrentPageRef.current = false;
            capturePageAnchor(nextPage);
            setQuery((previous) => ({ ...previous, page: nextPage }));
            return;
          }

          if (
            scrollDirectionRef.current === "up"
            && nextPage < query.page
            && nextPage >= 1
          ) {
            hasUserScrolledRef.current = false;
            shouldAlignCurrentPageRef.current = false;
            capturePageAnchor(nextPage);
            setQuery((previous) => ({ ...previous, page: nextPage }));
            return;
          }
        }
      },
      { rootMargin: "-30% 0px -45% 0px", threshold: 0 },
    );

    pageElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [visiblePages, pageElementsRef, meta.totalPages, isLoading, query.page, setQuery]);

  useLayoutEffect(() => {
    const pendingAnchor = pendingAnchorRef.current;
    if (!pendingAnchor) {
      return;
    }

    const anchorElement = pageElementsRef.current.get(pendingAnchor.page);
    if (!anchorElement) {
      return;
    }

    if (!isVisibleWindowForCurrentPage()) {
      return;
    }

    pendingAnchorRef.current = null;
    const nextTop = getPageBounds(anchorElement).top;
    const top = Math.max(0, window.scrollY + nextTop - pendingAnchor.top);

    try {
      window.scrollTo({ top, behavior: "auto" });
    } catch {
      window.scrollTo(0, top);
    }
    previousScrollYRef.current = top;
  }, [query.page, visiblePages, measurementVersion, pageElementsRef]);

  useLayoutEffect(() => {
    if (!shouldAlignCurrentPageRef.current) {
      return;
    }

    if (query.page === 1) {
      shouldAlignCurrentPageRef.current = false;
      hasUserScrolledRef.current = false;
      return;
    }

    const currentPageElement = pageElementsRef.current.get(query.page);
    const hasCurrentPage = visiblePages.some(
      (pageResult) => pageResult.page === query.page,
    );
    const hasPreviousPage =
      query.page <= 1
      || visiblePages.some((pageResult) => pageResult.page === query.page - 1);

    if (!currentPageElement || !hasCurrentPage || !hasPreviousPage) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      const activeQuery = currentQueryRef.current;
      if (activeQuery.page !== query.page || queryKey(activeQuery) !== currentQueryKey) {
        return;
      }

      shouldAlignCurrentPageRef.current = false;
      hasUserScrolledRef.current = false;
      const top = Math.max(
        0,
        getPageBounds(currentPageElement).top + window.scrollY,
      );

      currentPageElement.scrollIntoView({ block: "start", behavior: "auto" });
      try {
        window.scrollTo({ top, behavior: "auto" });
      } catch {
        window.scrollTo(0, top);
      }
      previousScrollYRef.current = top;
    });

    return () => cancelAnimationFrame(frameId);
  }, [
    currentQueryKey,
    query.page,
    visiblePages,
    measurementVersion,
    pageElementsRef,
  ]);

  function capturePageAnchor(page: number): void {
    const element = pageElementsRef.current.get(page);
    if (!element) {
      pendingAnchorRef.current = null;
      return;
    }

    pendingAnchorRef.current = {
      page,
      top: getPageBounds(element).top,
    };
  }

  function isVisibleWindowForCurrentPage(): boolean {
    if (visiblePages.length === 0) {
      return false;
    }

    const firstPage = visiblePages[0]?.page;
    const lastPage = visiblePages[visiblePages.length - 1]?.page;
    const expectedFirstPage = Math.max(1, query.page - WARM_PAGE_RADIUS);
    const expectedLastPage =
      meta.totalPages > 0
        ? Math.min(meta.totalPages, query.page + WARM_PAGE_RADIUS)
        : query.page + WARM_PAGE_RADIUS;

    return firstPage >= expectedFirstPage && lastPage <= expectedLastPage;
  }

  function getObservedPage(target: Element): number {
    for (const [page, element] of pageElementsRef.current) {
      if (getPageAnchorElement(element) === target) {
        return page;
      }
    }

    return Number.NaN;
  }

  return {
    alignOnNextRender,
    resetScrollPaging,
  };
}
