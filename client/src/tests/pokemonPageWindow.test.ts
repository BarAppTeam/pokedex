import { describe, expect, test } from "vitest";
import {
  calculatePageSpacerHeight,
  getContiguousVisiblePages,
  getWarmPageNumbers,
} from "../hooks/usePokemonPageWindow";
import type { PokemonPage } from "../types";

function page(pageNumber: number): PokemonPage {
  return {
    items: [],
    page: pageNumber,
    pageSize: 20,
    total: 100,
    totalPages: 5,
    hasNext: pageNumber < 5,
    sort: "asc",
    type: "",
    q: "",
  };
}

describe("pokemon page window helpers", () => {
  test("warms pages around the current page without leaving bounds", () => {
    expect(getWarmPageNumbers(1, 5)).toEqual([1, 2]);
    expect(getWarmPageNumbers(3, 5)).toEqual([2, 3, 4]);
    expect(getWarmPageNumbers(5, 5)).toEqual([4, 5]);
  });

  test("builds a contiguous window and stops at cache gaps", () => {
    const cache = new Map([
      [1, page(1)],
      [3, page(3)],
      [4, page(4)],
      [5, page(5)],
    ]);

    expect(getContiguousVisiblePages(cache, page(4))).toEqual([
      page(3),
      page(4),
      page(5),
    ]);
    expect(getContiguousVisiblePages(cache, page(3))).toEqual([
      page(3),
      page(4),
    ]);
  });

  test("calculates spacer height from measured pages and estimates missing pages", () => {
    const measuredHeights = new Map([
      [1, 100],
      [3, 200],
    ]);

    expect(calculatePageSpacerHeight(1, 3, measuredHeights, 150)).toBe(498);
    expect(calculatePageSpacerHeight(4, 3, measuredHeights, 150)).toBe(0);
  });
});
