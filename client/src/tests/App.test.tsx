import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "../App";
import { MockIntersectionObserver } from "./setupTests";
import type { Pokemon, PokemonPage } from "../types";

const pikachu: Pokemon = {
  id: "25::Pikachu",
  number: 25,
  name: "Pikachu",
  displayName: "Pikachu",
  type_one: "Electric",
  type_two: "",
  total: 320,
  hit_points: 35,
  attack: 55,
  defense: 40,
  special_attack: 50,
  special_defense: 50,
  speed: 90,
  generation: 1,
  legendary: false,
  captured: false,
  imageUrl: "https://img.pokemondb.net/sprites/x-y/normal/pikachu.png",
};

const charmander: Pokemon = {
  ...pikachu,
  id: "4::Charmander",
  number: 4,
  name: "Charmander",
  displayName: "Charmander",
  type_one: "Fire",
  imageUrl: "https://img.pokemondb.net/sprites/x-y/normal/charmander.png",
};

const charmeleon: Pokemon = {
  ...charmander,
  id: "5::Charmeleon",
  number: 5,
  name: "Charmeleon",
  displayName: "Charmeleon",
  imageUrl: "https://img.pokemondb.net/sprites/x-y/normal/charmeleon.png",
};

const bulbasaur: Pokemon = {
  ...pikachu,
  id: "1::Bulbasaur",
  number: 1,
  name: "Bulbasaur",
  displayName: "Bulbasaur",
  type_one: "Grass",
  imageUrl: "https://img.pokemondb.net/sprites/x-y/normal/bulbasaur.png",
};

const squirtle: Pokemon = {
  ...pikachu,
  id: "7::Squirtle",
  number: 7,
  name: "Squirtle",
  displayName: "Squirtle",
  type_one: "Water",
  imageUrl: "https://img.pokemondb.net/sprites/x-y/normal/squirtle.png",
};

const mew: Pokemon = {
  ...pikachu,
  id: "151::Mew",
  number: 151,
  name: "Mew",
  displayName: "Mew",
  type_one: "Psychic",
  imageUrl: "https://img.pokemondb.net/sprites/x-y/normal/mew.png",
};

const eevee: Pokemon = {
  ...pikachu,
  id: "133::Eevee",
  number: 133,
  name: "Eevee",
  displayName: "Eevee",
  type_one: "Normal",
  imageUrl: "https://img.pokemondb.net/sprites/x-y/normal/eevee.png",
};

const pokemonByPage = new Map<number, Pokemon[]>([
  [1, [pikachu]],
  [2, [charmander]],
  [3, [bulbasaur]],
  [4, [squirtle]],
  [5, [mew]],
  [6, [eevee]],
]);

function pokemonPage(
  items: Pokemon[],
  page: number,
  hasNext = page < 6,
  totalPages = 6,
): PokemonPage {
  return {
    items,
    page,
    pageSize: 20,
    total: totalPages,
    totalPages,
    hasNext,
    sort: "asc",
    type: "",
    q: "",
  };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

function installFetchMock() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const params = new URL(url, "http://localhost").searchParams;
    const page = Number(params.get("page") ?? "1");

    if (url.includes("/api/types")) {
      return jsonResponse({ types: ["Electric", "Fire"] });
    }

    if (url.includes("/api/captured")) {
      return jsonResponse({ id: "25::Pikachu", captured: true });
    }

    if (url.includes("page=999")) {
      return jsonResponse({
        ...pokemonPage([], 999, false),
        total: 6,
        totalPages: 6,
      });
    }

    return jsonResponse(pokemonPage(pokemonByPage.get(page) ?? [pikachu], page));
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function installAbortAwareFetchMock() {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const params = new URL(url, "http://localhost").searchParams;
    const page = Number(params.get("page") ?? "1");

    if (url.includes("/api/types")) {
      return Promise.resolve(jsonResponse({ types: ["Electric", "Fire"] }));
    }

    if (url.includes("/api/captured")) {
      return Promise.resolve(jsonResponse({ id: "25::Pikachu", captured: true }));
    }

    const response = pokemonPage(pokemonByPage.get(page) ?? [pikachu], page);

    return new Promise<Response>((resolve, reject) => {
      const signal = init?.signal;
      const rejectAbort = () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      };

      if (signal?.aborted) {
        rejectAbort();
        return;
      }

      signal?.addEventListener("abort", rejectAbort, { once: true });
      setTimeout(() => {
        signal?.removeEventListener("abort", rejectAbort);
        resolve(jsonResponse(response));
      }, 0);
    });
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function pokemonRequestUrls(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => url.includes("/api/pokemon"));
}

function capturedRequestUrls(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => url.includes("/api/captured"));
}

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/");
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
    MockIntersectionObserver.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("toolbar controls update Pokemon request params", async () => {
    const fetchMock = installFetchMock();
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText("Pikachu");

    await user.selectOptions(screen.getByLabelText("Type"), "Fire");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("type=Fire"),
        expect.any(Object),
      );
    });
  });

  test("type loading failure disables only the type filter and keeps Pokemon visible", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const params = new URL(url, "http://localhost").searchParams;
        const page = Number(params.get("page") ?? "1");

        if (url.includes("/api/types")) {
          return jsonResponse({ error: "types unavailable" }, false, 500);
        }

        return jsonResponse(pokemonPage(pokemonByPage.get(page) ?? [pikachu], page));
      }),
    );

    render(<App />);
    await screen.findByText("Pikachu");

    expect(screen.getByLabelText("Type")).toBeDisabled();
    expect(screen.getByText("Could not load Pokemon types.")).toBeInTheDocument();
    expect(screen.queryByText("No Pokémon found")).not.toBeInTheDocument();
  });

  test("captured toggle updates the card and saves to the backend", async () => {
    const fetchMock = installFetchMock();
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText("Pikachu");

    await user.click(screen.getByRole("button", { name: "Capture Pikachu" }));

    expect(screen.getByRole("button", { name: "Release Pikachu" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/captured"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ id: "25::Pikachu", captured: true }),
      }),
    );
  });

  test("capture toggle is disabled while saving and ignores duplicate clicks", async () => {
    const pendingCapture = deferredResponse();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const params = new URL(url, "http://localhost").searchParams;
      const page = Number(params.get("page") ?? "1");

      if (url.includes("/api/types")) {
        return Promise.resolve(jsonResponse({ types: ["Electric", "Fire"] }));
      }

      if (url.includes("/api/captured")) {
        return pendingCapture.promise;
      }

      return Promise.resolve(jsonResponse(pokemonPage(pokemonByPage.get(page) ?? [pikachu], page)));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText("Pikachu");

    await user.click(screen.getByRole("button", { name: "Capture Pikachu" }));

    const releaseButton = screen.getByRole("button", { name: "Release Pikachu" });
    expect(releaseButton).toBeDisabled();

    await user.click(releaseButton);
    expect(capturedRequestUrls(fetchMock)).toHaveLength(1);

    pendingCapture.resolve(jsonResponse({ id: "25::Pikachu", captured: true }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Release Pikachu" })).toBeEnabled();
    });
  });

  test("failed capture save rolls back the optimistic state and reenables capture", async () => {
    const pendingCapture = deferredResponse();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const params = new URL(url, "http://localhost").searchParams;
      const page = Number(params.get("page") ?? "1");

      if (url.includes("/api/types")) {
        return Promise.resolve(jsonResponse({ types: ["Electric", "Fire"] }));
      }

      if (url.includes("/api/captured")) {
        return pendingCapture.promise;
      }

      return Promise.resolve(jsonResponse(pokemonPage(pokemonByPage.get(page) ?? [pikachu], page)));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText("Pikachu");

    await user.click(screen.getByRole("button", { name: "Capture Pikachu" }));

    expect(screen.getByRole("button", { name: "Release Pikachu" })).toBeDisabled();

    pendingCapture.resolve(jsonResponse({ error: "save failed" }, false, 500));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Capture Pikachu" })).toBeEnabled();
    });
    expect(screen.getByText("Could not save captured state. Please try again.")).toBeInTheDocument();
  });

  test("theme starts from platform preference and persists manual toggle", async () => {
    installFetchMock();
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText("Pikachu");

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    await user.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem("pokedex-theme")).toBe("light");
  });

  test("loads the current page when StrictMode aborts the first effect pass", async () => {
    installAbortAwareFetchMock();

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    await screen.findByText("Pikachu");
    expect(screen.getByText("Page 1 of 6")).toBeInTheDocument();
  });

  test("does not auto-align the first page on initial load", async () => {
    installFetchMock();
    const scrollIntoViewSpy = vi.spyOn(
      window.HTMLElement.prototype,
      "scrollIntoView",
    );

    render(<App />);
    await screen.findByText("Pikachu");
    await screen.findByText("Charmander");
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  test("renders the next page window before the user reaches it", async () => {
    const fetchMock = installFetchMock();

    render(<App />);
    await screen.findByText("Pikachu");
    await screen.findByText("Charmander");

    expect(screen.getByTestId("page-window-1")).toBeInTheDocument();
    expect(screen.getByTestId("page-window-2")).toBeInTheDocument();
    expect(
      pokemonRequestUrls(fetchMock).filter((url) => url.includes("page=2")),
    ).toHaveLength(1);
  });

  test("scrolling into a prefetched page updates the URL and refreshes that page", async () => {
    const fetchMock = installFetchMock();

    render(<App />);
    await screen.findByText("Charmander");

    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: 1 }));
      MockIntersectionObserver.triggerElement(screen.getByTestId("page-window-2"));
    });

    await waitFor(() => {
      expect(window.location.search).toContain("page=2");
    });
    await screen.findByText("Bulbasaur");
    expect(screen.getByText("Pikachu")).toBeInTheDocument();
    expect(screen.getByText("Charmander")).toBeInTheDocument();
    expect(
      pokemonRequestUrls(fetchMock).filter((url) => url.includes("page=2")),
    ).toHaveLength(2);
  });

  test("revisiting a cached page refetches the current page so live DB changes are shown", async () => {
    let secondPage = charmander;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const params = new URL(url, "http://localhost").searchParams;
      const page = Number(params.get("page") ?? "1");

      if (url.includes("/api/types")) {
        return jsonResponse({ types: ["Electric", "Fire"] });
      }

      return jsonResponse(
        pokemonPage(page === 2 ? [secondPage] : (pokemonByPage.get(page) ?? [pikachu]), page),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByText("Pikachu");
    await screen.findByText("Charmander");

    secondPage = charmeleon;

    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: 1 }));
      MockIntersectionObserver.triggerElement(screen.getByTestId("page-window-2"));
    });

    await screen.findByText("Charmeleon");
    expect(screen.queryByText("Charmander")).not.toBeInTheDocument();
    expect(
      pokemonRequestUrls(fetchMock).filter((url) => url.includes("page=2")),
    ).toHaveLength(2);
  });

  test("initial page loads the current page and only warm-radius pages", async () => {
    const fetchMock = installFetchMock();
    window.history.replaceState(null, "", "/?page=4&pageSize=20&sort=asc");

    render(<App />);
    await screen.findByText("Squirtle");
    await screen.findByText("Mew");
    await screen.findByText("Bulbasaur");

    const pokemonRequests = pokemonRequestUrls(fetchMock);
    expect(pokemonRequests).toContain("/api/pokemon?page=3&pageSize=20&sort=asc");
    expect(pokemonRequests).not.toContain("/api/pokemon?page=2&pageSize=20&sort=asc");
    expect(pokemonRequests).not.toContain("/api/pokemon?page=1&pageSize=20&sort=asc");
    expect(pokemonRequests).toContain("/api/pokemon?page=4&pageSize=20&sort=asc");
    expect(pokemonRequests).toContain("/api/pokemon?page=5&pageSize=20&sort=asc");
    expect(pokemonRequests).not.toContain("/api/pokemon?page=6&pageSize=20&sort=asc");
    expect(screen.queryByText("Charmander")).not.toBeInTheDocument();
    expect(screen.queryByText("Eevee")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("top-page-spacer")).toHaveStyle({ height: "232px" });
      expect(screen.getByTestId("bottom-page-spacer")).toHaveStyle({ height: "116px" });
    });
  });

  test("refreshing a page URL keeps the requested page aligned after warmup", async () => {
    installFetchMock();
    const scrollIntoViewSpy = vi.spyOn(
      window.HTMLElement.prototype,
      "scrollIntoView",
    );
    window.history.replaceState(null, "", "/?page=4&pageSize=20&sort=asc");

    render(<App />);
    await screen.findByText("Squirtle");
    await screen.findByText("Bulbasaur");
    await screen.findByText("Mew");
    expect(screen.queryByText("Charmander")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(scrollIntoViewSpy.mock.contexts).toContain(
        screen.getByTestId("page-window-4"),
      );
    });
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({
      block: "start",
      behavior: "auto",
    });
  });

  test("loading a middle page prefetches one page on either side", async () => {
    const fetchMock = installFetchMock();
    window.history.replaceState(null, "", "/?page=4&pageSize=20&sort=asc");

    render(<App />);
    await screen.findByText("Squirtle");

    await waitFor(() => {
      expect(pokemonRequestUrls(fetchMock)).toEqual(
        expect.arrayContaining([
          "/api/pokemon?page=3&pageSize=20&sort=asc",
          "/api/pokemon?page=4&pageSize=20&sort=asc",
          "/api/pokemon?page=5&pageSize=20&sort=asc",
        ]),
      );
    });
    expect(pokemonRequestUrls(fetchMock)).not.toContain(
      "/api/pokemon?page=2&pageSize=20&sort=asc",
    );
    expect(pokemonRequestUrls(fetchMock)).not.toContain(
      "/api/pokemon?page=6&pageSize=20&sort=asc",
    );
  });

  test("page handoff preserves the visual anchor while trimming into spacers", async () => {
    installFetchMock();
    const scrollToSpy = vi.spyOn(window, "scrollTo");
    vi.spyOn(window.HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getMockRect(this: HTMLElement) {
        const page = Number(this.dataset.page ?? this.parentElement?.dataset.page);
        if (page === 5) {
          const top = document.querySelector('[data-testid="page-window-3"]')
            ? 240
            : 80;
          return {
            x: 0,
            y: top,
            top,
            bottom: top + 100,
            left: 0,
            right: 100,
            width: 100,
            height: 100,
            toJSON: () => undefined,
          };
        }

        return {
          x: 0,
          y: 0,
          top: 0,
          bottom: 100,
          left: 0,
          right: 100,
          width: 100,
          height: 100,
          toJSON: () => undefined,
        };
      },
    );
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 1000,
    });
    window.history.replaceState(null, "", "/?page=4&pageSize=20&sort=asc");

    render(<App />);
    await screen.findByText("Mew");

    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: 1 }));
      MockIntersectionObserver.triggerElement(screen.getByTestId("page-window-5"));
    });

    await waitFor(() => {
      expect(window.location.search).toContain("page=5");
    });
    await waitFor(() => {
      expect(screen.queryByTestId("page-window-3")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("top-page-spacer")).toHaveStyle({ height: "348px" });
    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 840, behavior: "auto" });
    });
  });

  test("scrolling up from page two renders the previous page", async () => {
    installFetchMock();
    window.history.replaceState(null, "", "/?page=2&pageSize=20&sort=asc");

    render(<App />);
    await screen.findByText("Charmander");
    await screen.findByText("Pikachu");

    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: -1 }));
      MockIntersectionObserver.triggerElement(screen.getByTestId("page-window-1"));
    });

    await waitFor(() => {
      expect(window.location.search).toContain("page=1");
    });
    expect(screen.getByText("Charmander")).toBeInTheDocument();
  });

  test("non-user scroll events do not advance the page window", async () => {
    installFetchMock();
    window.history.replaceState(null, "", "/?page=2&pageSize=20&sort=asc");

    render(<App />);
    await screen.findByText("Charmander");

    act(() => {
      window.dispatchEvent(new Event("scroll"));
      MockIntersectionObserver.triggerElement(screen.getByTestId("page-window-3"));
    });

    expect(screen.getByText("Charmander")).toBeInTheDocument();
    expect(screen.getByText("Bulbasaur")).toBeInTheDocument();
    expect(window.location.search).toContain("page=2");
  });

  test("out-of-range pages recover to the last available page", async () => {
    const fetchMock = installFetchMock();
    window.history.replaceState(null, "", "/?page=999&pageSize=20&sort=asc");

    render(<App />);
    await screen.findByText("Eevee");

    const pokemonRequests = pokemonRequestUrls(fetchMock);

    expect(pokemonRequests).toContain("/api/pokemon?page=999&pageSize=20&sort=asc");
    expect(pokemonRequests).toContain("/api/pokemon?page=6&pageSize=20&sort=asc");
    expect(window.location.search).toContain("page=6");
  });

  test("page zero in the URL normalizes to page one instead of using stale storage", async () => {
    const fetchMock = installFetchMock();
    localStorage.setItem(
      "pokedex-query",
      JSON.stringify({ page: 3, pageSize: 20, sort: "asc", type: "", q: "" }),
    );
    window.history.replaceState(null, "", "/?page=0&pageSize=20&sort=asc");

    render(<App />);
    await screen.findByText("Pikachu");

    expect(pokemonRequestUrls(fetchMock)).toContain(
      "/api/pokemon?page=1&pageSize=20&sort=asc",
    );
    expect(pokemonRequestUrls(fetchMock)).not.toContain(
      "/api/pokemon?page=0&pageSize=20&sort=asc",
    );
    expect(window.location.search).toContain("page=1");
  });
});
