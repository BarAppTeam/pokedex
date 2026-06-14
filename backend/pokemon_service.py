from collections import defaultdict
from collections.abc import Iterable, Mapping
from difflib import SequenceMatcher
from heapq import nlargest, nsmallest
from math import ceil
from typing import Any
import unicodedata
from urllib.parse import quote

import db

PokemonRow = Mapping[str, Any]

captured_ids: set[str] = set()
FORM_SUFFIXES = (" Forme", " Cloak", " Mode", " Size")
SPRITE_SLUG_TRANSLATION = str.maketrans(
    {
        "♀": "-f",
        "♂": "-m",
        ".": "",
        "'": "",
    }
)


def compact_spaces(value: str) -> str:
    return " ".join(value.split())


def list_pokemon(
    *,
    page: int,
    page_size: int,
    sort_order: str,
    type_filter: str = "",
    search_query: str = "",
) -> dict[str, Any]:
    rows = read_pokemon_rows()
    base_names = build_base_name_map(rows)
    start = (page - 1) * page_size
    end = start + page_size
    page_items, total = select_sorted_page(
        rows,
        start=start,
        end=end,
        sort_order=sort_order,
        type_filter=type_filter,
        search_query=search_query,
    )
    total_pages = ceil(total / page_size) if total else 0

    return {
        "items": [enriched_pokemon(pokemon, base_names) for pokemon in page_items],
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": total_pages,
        "hasNext": page < total_pages,
        "sort": sort_order,
        "type": type_filter,
        "q": search_query,
    }


def get_types() -> list[str]:
    data = read_pokemon_rows()
    types = {
        pokemon[type_key]
        for pokemon in data
        for type_key in ("type_one", "type_two")
        if pokemon.get(type_key)
    }
    return sorted(types)


def set_captured(pokemon_identifier: str, captured: bool) -> None:
    if captured:
        captured_ids.add(pokemon_identifier)
    else:
        captured_ids.discard(pokemon_identifier)


def pokemon_exists(pokemon_identifier: str) -> bool:
    return any(pokemon_id(pokemon) == pokemon_identifier for pokemon in read_pokemon_rows())


def pokemon_id(pokemon: PokemonRow) -> str:
    return f"{pokemon['number']}::{pokemon['name']}"


def sprite_slug(name: str) -> str:
    normalized_name = unicodedata.normalize(
        "NFKD",
        compact_spaces(name).translate(SPRITE_SLUG_TRANSLATION),
    )
    ascii_name = normalized_name.encode("ascii", "ignore").decode("ascii")
    return ascii_name.lower().replace(" ", "-")


def leading_name_part(name: str) -> str:
    for index in range(1, len(name)):
        if name[index].isupper() and name[index - 1].islower():
            return name[:index]

    return name


def build_base_name_map(rows: Iterable[PokemonRow]) -> dict[int, str]:
    names_by_number: dict[int, list[str]] = defaultdict(list)
    for pokemon in rows:
        names_by_number[pokemon["number"]].append(str(pokemon["name"]))

    return {
        number: base_name_for_group(names)
        for number, names in names_by_number.items()
    }


def base_name_for_group(names: list[str]) -> str:
    if len(names) == 1:
        return leading_name_part(names[0])

    embedded_candidates = [
        candidate
        for candidate in names
        if all(name == candidate or name.startswith(candidate) for name in names)
    ]
    if embedded_candidates:
        return min(embedded_candidates, key=len)

    leading_parts = {leading_name_part(candidate) for candidate in names}
    if len(leading_parts) == 1:
        return leading_parts.pop()

    return min(names, key=len)


def base_name_for(pokemon: PokemonRow, base_names: Mapping[int, str]) -> str:
    return base_names.get(pokemon["number"], str(pokemon["name"]))


def spaced_form_name(form_name: str) -> str:
    output = []
    for index, char in enumerate(form_name):
        previous = form_name[index - 1] if index else ""
        if index and char.isupper() and previous.islower():
            output.append(" ")
        output.append(char)

    return compact_spaces("".join(output))


def strip_form_suffix(form_name: str) -> str:
    for suffix in FORM_SUFFIXES:
        if form_name.endswith(suffix):
            return form_name.removesuffix(suffix).strip()

    return form_name


def form_name_without_base_prefix(raw_name: str, base_name: str) -> str:
    return spaced_form_name(raw_name.removeprefix(base_name))


def name_contains_base_name(name: str, base_name: str) -> bool:
    return base_name in compact_spaces(name).split()


def display_name_for(pokemon: PokemonRow, base_names: Mapping[int, str]) -> str:
    raw_name = str(pokemon["name"])
    base_name = base_name_for(pokemon, base_names)
    if raw_name == base_name:
        return base_name

    form_name = form_name_without_base_prefix(raw_name, base_name)
    if name_contains_base_name(form_name, base_name):
        return form_name

    return f"{base_name} {form_name}"


def image_sprite_name_for(pokemon: PokemonRow, base_names: Mapping[int, str]) -> str:
    base_name = base_name_for(pokemon, base_names)
    display_name = display_name_for(pokemon, base_names)

    if display_name == base_name:
        return base_name
    if display_name.startswith(f"{base_name} "):
        return strip_form_suffix(display_name)
    if display_name.endswith(f" {base_name}"):
        return f"{base_name} {display_name.removesuffix(base_name).strip()}"

    form_name = display_name
    if base_name in form_name:
        form_name = form_name.replace(base_name, "", 1).strip()

    return compact_spaces(strip_form_suffix(f"{base_name} {form_name}".strip()))


def icon_url(name: str) -> str | None:
    normalized_slug = sprite_slug(name)
    rows = read_pokemon_rows()
    base_names = build_base_name_map(rows)
    for pokemon in rows:
        if (
            sprite_slug(str(pokemon.get("name", ""))) == normalized_slug
            or sprite_slug(display_name_for(pokemon, base_names)) == normalized_slug
        ):
            return sprite_url(image_sprite_name_for(pokemon, base_names))

    return None


def sprite_url(sprite_name: str) -> str:
    return f"https://img.pokemondb.net/sprites/x-y/normal/{quote(sprite_slug(sprite_name))}.png"


def enriched_pokemon(pokemon: PokemonRow, base_names: Mapping[int, str]) -> dict[str, Any]:
    item = dict(pokemon)
    item["id"] = pokemon_id(item)
    item["captured"] = item["id"] in captured_ids
    item["displayName"] = display_name_for(pokemon, base_names)
    item["imageUrl"] = sprite_url(image_sprite_name_for(pokemon, base_names))
    return item


def scalar_values(pokemon: PokemonRow) -> list[str]:
    values: list[str] = []
    for value in pokemon.values():
        if isinstance(value, (str, int, float, bool)):
            values.append(str(value).lower())
    return values


def matches_fuzzy_query(pokemon: PokemonRow, query: str) -> bool:
    normalized_query = query.strip().lower()
    if not normalized_query:
        return True

    return matches_normalized_fuzzy_query(pokemon, normalized_query)


def matches_normalized_fuzzy_query(pokemon: PokemonRow, normalized_query: str) -> bool:
    if not normalized_query:
        return True

    values = scalar_values(pokemon)
    if any(normalized_query in value for value in values):
        return True

    combined = " ".join(values)
    candidates = values + combined.split()
    matcher = SequenceMatcher()
    matcher.set_seq1(normalized_query)

    for candidate in candidates:
        matcher.set_seq2(candidate)
        if (
            matcher.real_quick_ratio() >= 0.78
            and matcher.quick_ratio() >= 0.78
            and matcher.ratio() >= 0.78
        ):
            return True

    return False


def type_matches(pokemon: PokemonRow, type_filter: str) -> bool:
    normalized_type = type_filter.lower()
    return type_matches_normalized(pokemon, normalized_type)


def type_matches_normalized(pokemon: PokemonRow, normalized_type: str) -> bool:
    return (
        pokemon.get("type_one", "").lower() == normalized_type
        or pokemon.get("type_two", "").lower() == normalized_type
    )


def select_sorted_page(
    rows: Iterable[PokemonRow],
    *,
    start: int,
    end: int,
    sort_order: str,
    type_filter: str,
    search_query: str,
) -> tuple[list[PokemonRow], int]:
    total = 0
    normalized_type = type_filter.strip().lower()
    normalized_query = search_query.strip().lower()

    def matching_rows():
        nonlocal total
        for pokemon in rows:
            if normalized_type and not type_matches_normalized(pokemon, normalized_type):
                continue
            if normalized_query and not matches_normalized_fuzzy_query(pokemon, normalized_query):
                continue
            total += 1
            yield pokemon

    selector = nlargest if sort_order == "desc" else nsmallest
    sorted_window = selector(end, matching_rows(), key=sort_key)
    return sorted_window[start:end], total


def sort_key(pokemon: PokemonRow) -> tuple[int, str]:
    return pokemon["number"], pokemon["name"]


def read_pokemon_rows() -> list[dict[str, Any]]:
    return db.get()
