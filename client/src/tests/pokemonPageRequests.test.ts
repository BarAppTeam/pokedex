import { describe, expect, test } from "vitest";
import { pageCacheKey } from "../hooks/usePokemonPageRequests";
import type { QueryState } from "../types";

function query(page: number): QueryState {
  return {
    page,
    pageSize: 20,
    sort: "desc",
    type: "fire",
    q: "char",
  };
}

describe("pokemon page request helpers", () => {
  test("keys cached pages by query controls and requested page", () => {
    expect(pageCacheKey(query(1), 2)).toBe(
      '{"pageSize":20,"sort":"desc","type":"fire","q":"char"}::2',
    );
    expect(pageCacheKey(query(2), 1)).toBe(pageCacheKey(query(1), 1));
    expect(pageCacheKey(query(1), 2)).not.toBe(pageCacheKey(query(1), 1));
  });
});
