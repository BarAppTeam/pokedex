import { CheckCircle2, Circle } from "lucide-react";
import type { Pokemon } from "../types";

interface PokemonCardProps {
  pokemon: Pokemon;
  isCaptureSaving: boolean;
  onToggleCaptured: (pokemon: Pokemon) => void;
}

export function PokemonCard({
  pokemon,
  isCaptureSaving,
  onToggleCaptured,
}: PokemonCardProps) {
  const name = pokemon.displayName;

  return (
    <article className="pokemon-card">
      <div className="pokemon-media">
        <img
          src={pokemon.imageUrl}
          alt={name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.classList.add("image-missing");
          }}
        />
      </div>

      <div className="pokemon-content">
        <div className="pokemon-title-row">
          <div>
            <span className="pokemon-number">#{String(pokemon.number).padStart(3, "0")}</span>
            <h2>{name}</h2>
          </div>
          <button
            className={pokemon.captured ? "capture-button captured" : "capture-button"}
            type="button"
            aria-label={`${pokemon.captured ? "Release" : "Capture"} ${name}`}
            aria-busy={isCaptureSaving}
            disabled={isCaptureSaving}
            title={`${pokemon.captured ? "Release" : "Capture"} ${name}`}
            onClick={() => onToggleCaptured(pokemon)}
          >
            {pokemon.captured ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
          </button>
        </div>

        <div className="type-row">
          {[pokemon.type_one, pokemon.type_two].filter(Boolean).map((type) => (
            <span className={`type-chip type-${type.toLowerCase()}`} key={type}>
              {type}
            </span>
          ))}
        </div>

        <dl className="stats-grid">
          <Stat label="Total" value={pokemon.total} />
          <Stat label="HP" value={pokemon.hit_points} />
          <Stat label="Atk" value={pokemon.attack} />
          <Stat label="Def" value={pokemon.defense} />
          <Stat label="SpA" value={pokemon.special_attack} />
          <Stat label="SpD" value={pokemon.special_defense} />
          <Stat label="Speed" value={pokemon.speed} />
          <Stat label="Gen" value={pokemon.generation} />
        </dl>

        {pokemon.legendary ? <span className="legendary-label">Legendary</span> : null}
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
