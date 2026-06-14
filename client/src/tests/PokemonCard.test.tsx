import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { PokemonCard } from "../components/PokemonCard";
import type { Pokemon } from "../types";

const treecko: Pokemon = {
  id: "252::Treecko",
  number: 252,
  name: "Treecko",
  displayName: "Treecko",
  type_one: "Grass",
  type_two: "",
  total: 310,
  hit_points: 40,
  attack: 45,
  defense: 35,
  special_attack: 65,
  special_defense: 55,
  speed: 70,
  generation: 3,
  legendary: false,
  captured: false,
  imageUrl: "https://example.test/treecko.png",
};

describe("PokemonCard", () => {
  test("marks a missing image without swapping to a different source", () => {
    render(
      <PokemonCard
        pokemon={treecko}
        isCaptureSaving={false}
        onToggleCaptured={vi.fn()}
      />,
    );

    const image = screen.getByRole("img", { name: "Treecko" });
    fireEvent.error(image);

    expect(image).toHaveAttribute("src", treecko.imageUrl);
    expect(image).toHaveClass("image-missing");
  });

  test("uses the normalized display name for visible and accessible labels", () => {
    render(
      <PokemonCard
        pokemon={{
          ...treecko,
          id: "6::CharizardMega Charizard X",
          number: 6,
          name: "CharizardMega Charizard X",
          displayName: "Mega Charizard X",
        }}
        isCaptureSaving={false}
        onToggleCaptured={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Mega Charizard X" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Mega Charizard X" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Capture Mega Charizard X" })).toBeInTheDocument();
  });
});
