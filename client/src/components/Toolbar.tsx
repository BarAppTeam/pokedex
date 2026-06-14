import { Search, SortAsc, SortDesc } from "lucide-react";
import { PAGE_SIZES } from "../constants";
import type { QueryState } from "../types";

interface ToolbarProps {
  query: QueryState;
  searchText: string;
  types: string[];
  typesError: string | null;
  typesLoading: boolean;
  onSearchTextChange: (value: string) => void;
  onControlChange: (values: Partial<Omit<QueryState, "page">>) => void;
}

export function Toolbar({
  query,
  searchText,
  types,
  typesError,
  typesLoading,
  onSearchTextChange,
  onControlChange,
}: ToolbarProps) {
  return (
    <section className="toolbar" aria-label="Pokemon controls">
      <label className="search-control">
        <span>Search</span>
        <Search className="search-icon" aria-hidden="true" />
        <input
          value={searchText}
          type="search"
          placeholder="Name, stat, type..."
          onChange={(event) => onSearchTextChange(event.target.value)}
        />
      </label>

      <label>
        <span>Type</span>
        <select
          value={query.type}
          disabled={typesError !== null}
          aria-label="Type"
          aria-busy={typesLoading}
          aria-describedby={typesError ? "type-load-error" : undefined}
          onChange={(event) => onControlChange({ type: event.target.value })}
        >
          <option value="">All types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {typesError ? (
          <span id="type-load-error" className="control-warning">
            {typesError}
          </span>
        ) : null}
      </label>

      <label>
        <span>Page size</span>
        <select
          value={query.pageSize}
          onChange={(event) => onControlChange({ pageSize: Number(event.target.value) })}
        >
          {PAGE_SIZES.map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {pageSize}
            </option>
          ))}
        </select>
      </label>

      <button
        className="sort-button"
        type="button"
        onClick={() => onControlChange({ sort: query.sort === "asc" ? "desc" : "asc" })}
        title="Sort by Pokédex number"
      >
        {query.sort === "asc" ? <SortAsc aria-hidden="true" /> : <SortDesc aria-hidden="true" />}
        <span>{query.sort === "asc" ? "Number asc" : "Number desc"}</span>
      </button>
    </section>
  );
}
