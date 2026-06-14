import {
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { PokemonPage } from "../types";

export const WARM_PAGE_RADIUS = 1;
export const PAGE_WINDOW_GAP = 16;

export interface PokemonPageWindow {
  bottomSpacerHeight: number;
  measurementVersion: number;
  pageElementsRef: MutableRefObject<Map<number, HTMLElement>>;
  registerPageWindow: (page: number, element: HTMLElement | null) => void;
  resetPageWindow: () => void;
  topSpacerHeight: number;
}

export function usePokemonPageWindow(
  visiblePages: PokemonPage[],
  totalPages: number,
): PokemonPageWindow {
  const [measurementVersion, setMeasurementVersion] = useState(0);
  const pageElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const pageHeightsRef = useRef<Map<number, number>>(new Map());
  const estimatedPageHeight = getEstimatedPageHeight(pageHeightsRef.current);

  const topSpacerHeight = calculatePageSpacerHeight(
    1,
    (visiblePages[0]?.page ?? 1) - 1,
    pageHeightsRef.current,
    estimatedPageHeight,
  );
  const bottomSpacerHeight = calculatePageSpacerHeight(
    (visiblePages[visiblePages.length - 1]?.page ?? totalPages) + 1,
    totalPages,
    pageHeightsRef.current,
    estimatedPageHeight,
  );

  useLayoutEffect(() => {
    let changed = false;
    visiblePages.forEach((pageResult) => {
      const element = pageElementsRef.current.get(pageResult.page);
      if (!element) {
        return;
      }

      const height = getPageBounds(element).height;
      if (height <= 0) {
        return;
      }

      const previousHeight = pageHeightsRef.current.get(pageResult.page);
      if (previousHeight === undefined || Math.abs(previousHeight - height) > 1) {
        pageHeightsRef.current.set(pageResult.page, height);
        changed = true;
      }
    });

    if (changed) {
      setMeasurementVersion((version) => version + 1);
    }
  }, [visiblePages]);

  function registerPageWindow(page: number, element: HTMLElement | null): void {
    if (element) {
      pageElementsRef.current.set(page, element);
    } else {
      pageElementsRef.current.delete(page);
    }
  }

  function resetPageWindow(): void {
    pageHeightsRef.current.clear();
    setMeasurementVersion((version) => version + 1);
  }

  return {
    bottomSpacerHeight,
    measurementVersion,
    pageElementsRef,
    registerPageWindow,
    resetPageWindow,
    topSpacerHeight,
  };
}

export function getWarmPageNumbers(
  centerPage: number,
  totalPages: number,
  warmPageRadius = WARM_PAGE_RADIUS,
): number[] {
  const minPage = Math.max(1, centerPage - warmPageRadius);
  const maxPage =
    totalPages > 0
      ? Math.min(totalPages, centerPage + warmPageRadius)
      : centerPage + warmPageRadius;
  const pages: number[] = [];

  for (let page = minPage; page <= maxPage; page += 1) {
    pages.push(page);
  }

  return pages;
}

export function getContiguousVisiblePages(
  cachedPages: Map<number, PokemonPage>,
  centerPage: PokemonPage,
  warmPageRadius = WARM_PAGE_RADIUS,
): PokemonPage[] {
  const pages = [centerPage];
  const minPage = Math.max(1, centerPage.page - warmPageRadius);
  const maxPage =
    centerPage.totalPages > 0
      ? Math.min(centerPage.totalPages, centerPage.page + warmPageRadius)
      : centerPage.page + warmPageRadius;

  for (let page = centerPage.page - 1; page >= minPage; page -= 1) {
    const pageResult = cachedPages.get(page);
    if (!pageResult) {
      break;
    }
    pages.unshift(pageResult);
  }

  for (let page = centerPage.page + 1; page <= maxPage; page += 1) {
    const pageResult = cachedPages.get(page);
    if (!pageResult) {
      break;
    }
    pages.push(pageResult);
  }

  return pages;
}

export function calculatePageSpacerHeight(
  startPage: number,
  endPage: number,
  measuredHeights: Map<number, number>,
  estimatedHeight: number,
  pageWindowGap = PAGE_WINDOW_GAP,
): number {
  if (startPage > endPage) {
    return 0;
  }

  let height = 0;
  for (let page = startPage; page <= endPage; page += 1) {
    height += measuredHeights.get(page) ?? estimatedHeight;
    height += pageWindowGap;
  }

  return Math.round(height);
}

export function getEstimatedPageHeight(measuredHeights: Map<number, number>): number {
  const heights = Array.from(measuredHeights.values());
  if (heights.length === 0) {
    return 0;
  }

  return heights.reduce((total, height) => total + height, 0) / heights.length;
}

export function getPageAnchorElement(pageElement: HTMLElement): HTMLElement {
  return pageElement.firstElementChild instanceof HTMLElement
    ? pageElement.firstElementChild
    : pageElement;
}

export function getPageBounds(pageElement: HTMLElement): DOMRect {
  const children = Array.from(pageElement.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
  if (children.length === 0) {
    return pageElement.getBoundingClientRect();
  }

  const rects = children.map((child) => child.getBoundingClientRect());
  const top = Math.min(...rects.map((rect) => rect.top));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.right));
  const width = right - left;
  const height = bottom - top;

  return {
    x: left,
    y: top,
    top,
    bottom,
    left,
    right,
    width,
    height,
    toJSON: () => undefined,
  } as DOMRect;
}
