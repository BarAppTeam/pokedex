import { useEffect, useState } from "react";
import { fetchTypes } from "../api";

interface PokemonTypesState {
  types: string[];
  error: string | null;
  isLoading: boolean;
}

export function usePokemonTypes(): PokemonTypesState {
  const [types, setTypes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetchTypes(controller.signal)
      .then((nextTypes) => {
        setTypes(nextTypes);
        setError(null);
      })
      .catch((nextError: Error) => {
        if (nextError.name !== "AbortError") {
          setTypes([]);
          setError("Could not load Pokemon types.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return { types, error, isLoading };
}
