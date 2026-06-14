import { PAGE_SIZES, QUERY_STORAGE_KEY } from "./constants";
import type { QueryState, SortOrder } from "./types";

export function readInitialQuery(): QueryState {
  const stored = safeParseQuery(localStorage.getItem(QUERY_STORAGE_KEY));
  const source = new URLSearchParams(window.location.search);

  const page = parsePage(source.get("page"), stored?.page);
  const pageSize = parseAllowedNumber(
    source.get("pageSize"),
    stored?.pageSize ?? 20,
    (value) => PAGE_SIZES.includes(value as (typeof PAGE_SIZES)[number]),
  );
  const sort = parseSort(source.get("sort") ?? stored?.sort);
  const type = source.get("type") ?? stored?.type ?? "";
  const q = source.get("q") ?? stored?.q ?? "";

  return { page, pageSize, sort, type, q };
}

export function persistQuery(query: QueryState): void {
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

  window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  localStorage.setItem(QUERY_STORAGE_KEY, JSON.stringify(query));
}

export function queryKey(query: QueryState): string {
  return JSON.stringify({
    pageSize: query.pageSize,
    sort: query.sort,
    type: query.type,
    q: query.q,
  });
}

function safeParseQuery(value: string | null): Partial<QueryState> | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Partial<QueryState>;
  } catch {
    return null;
  }
}

function parseAllowedNumber(
  value: string | null,
  fallback: number,
  predicate: (value: number) => boolean,
): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && predicate(parsed)) {
    return parsed;
  }

  return predicate(fallback) ? fallback : 1;
}

function parsePage(value: string | null, storedValue: number | undefined): number {
  if (value !== null) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
  }

  return typeof storedValue === "number" && Number.isInteger(storedValue) && storedValue >= 1
    ? storedValue
    : 1;
}

function parseSort(value: string | null | undefined): SortOrder {
  return value === "desc" ? "desc" : "asc";
}
