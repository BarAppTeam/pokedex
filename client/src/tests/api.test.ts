import { describe, expect, test } from "vitest";
import { buildPokemonUrl } from "../api";

describe("api urls", () => {
  test("uses relative API URLs by default so Vite can proxy requests in development", () => {
    const url = buildPokemonUrl({
      page: 2,
      pageSize: 20,
      sort: "desc",
      type: "Fire",
      q: "char",
    });

    expect(url).toBe("/api/pokemon?page=2&pageSize=20&sort=desc&type=Fire&q=char");
  });
});
