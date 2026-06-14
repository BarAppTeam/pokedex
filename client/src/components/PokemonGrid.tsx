import type { Pokemon } from "../types";
import { PokemonCard } from "./PokemonCard";

const EMPTY_CAPTURE_SAVING_IDS = new Set<string>();

interface PokemonGridProps {
  pokemon: Pokemon[];
  captureSavingIds?: Set<string>;
  onToggleCaptured: (pokemon: Pokemon) => void;
}

export function PokemonGrid({
  pokemon,
  captureSavingIds = EMPTY_CAPTURE_SAVING_IDS,
  onToggleCaptured,
}: PokemonGridProps) {
  return (
    <section className="pokemon-grid" aria-label="Pokemon list">
      {pokemon.map((item) => (
        <PokemonCard
          key={item.id}
          pokemon={item}
          isCaptureSaving={captureSavingIds.has(item.id)}
          onToggleCaptured={onToggleCaptured}
        />
      ))}
    </section>
  );
}
