import { useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { ListFeedback } from "./components/ListFeedback";
import { PokemonCard } from "./components/PokemonCard";
import { Toolbar } from "./components/Toolbar";
import { usePokemonPages } from "./hooks/usePokemonPages";
import { usePokemonTypes } from "./hooks/usePokemonTypes";
import { useTheme } from "./hooks/useTheme";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { persistQuery, readInitialQuery } from "./queryState";
import type { QueryState } from "./types";

export default function App() {
  const [query, setQuery] = useState<QueryState>(() => readInitialQuery());
  const [searchText, setSearchText] = useState(query.q);
  const debouncedSearch = useDebouncedValue(searchText.trim(), 300);
  const { theme, toggleTheme } = useTheme();
  const {
    types,
    error: typesError,
    isLoading: typesLoading,
  } = usePokemonTypes();
  const {
    items,
    visiblePages,
    topSpacerHeight,
    bottomSpacerHeight,
    captureSavingIds,
    meta,
    isLoading,
    error,
    registerPageWindow,
    updateControl,
    toggleCaptured,
  } = usePokemonPages(query, setQuery);

  useEffect(() => {
    persistQuery(query);
  }, [query]);

  useEffect(() => {
    setQuery((previous) =>
      previous.q === debouncedSearch ? previous : { ...previous, q: debouncedSearch, page: 1 },
    );
  }, [debouncedSearch]);

  return (
    <main className="app-shell">
      <AppHeader theme={theme} onToggleTheme={toggleTheme} />

      <Toolbar
        query={query}
        searchText={searchText}
        types={types}
        typesError={typesError}
        typesLoading={typesLoading}
        onSearchTextChange={setSearchText}
        onControlChange={updateControl}
      />

      <ListFeedback
        total={meta.total}
        visible={items.length}
        page={meta.page}
        totalPages={meta.totalPages}
        isLoading={isLoading}
        error={error}
      />

      <div
        className="page-spacer"
        data-testid="top-page-spacer"
        style={{ height: topSpacerHeight }}
        aria-hidden="true"
      />

      <section className="pokemon-grid pokemon-stream-grid" aria-label="Pokemon list">
        {visiblePages.map((pageResult) => (
          <section
            key={pageResult.page}
            ref={(element) => registerPageWindow(pageResult.page, element)}
            className="page-window"
            data-page={pageResult.page}
            data-testid={`page-window-${pageResult.page}`}
            aria-label={`Pokemon page ${pageResult.page}`}
          >
            {pageResult.items.map((item) => (
              <PokemonCard
                key={item.id}
                pokemon={item}
                isCaptureSaving={captureSavingIds.has(item.id)}
                onToggleCaptured={toggleCaptured}
              />
            ))}
          </section>
        ))}
      </section>

      <div
        className="page-spacer"
        data-testid="bottom-page-spacer"
        style={{ height: bottomSpacerHeight }}
        aria-hidden="true"
      />

      {isLoading ? <div className="loading-state">Loading Pokémon...</div> : null}
      {!isLoading && items.length > 0 && !meta.hasNext ? (
        <div className="end-state">End of the Pokédex</div>
      ) : null}
    </main>
  );
}
