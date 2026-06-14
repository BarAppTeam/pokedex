from collections.abc import Iterator, Mapping

import pytest

import app as pokedex_app
from backend import create_app
from backend import pokemon_service


POKEMON = [
    {
        "number": 1,
        "name": "Bulbasaur",
        "type_one": "Grass",
        "type_two": "Poison",
        "total": 318,
        "hit_points": 45,
        "attack": 49,
        "defense": 49,
        "special_attack": 65,
        "special_defense": 65,
        "speed": 45,
        "generation": 1,
        "legendary": False,
    },
    {
        "number": 4,
        "name": "Charmander",
        "type_one": "Fire",
        "type_two": "",
        "total": 309,
        "hit_points": 39,
        "attack": 52,
        "defense": 43,
        "special_attack": 60,
        "special_defense": 50,
        "speed": 65,
        "generation": 1,
        "legendary": False,
    },
    {
        "number": 6,
        "name": "CharizardMega Charizard X",
        "type_one": "Fire",
        "type_two": "Dragon",
        "total": 634,
        "hit_points": 78,
        "attack": 130,
        "defense": 111,
        "special_attack": 130,
        "special_defense": 85,
        "speed": 100,
        "generation": 1,
        "legendary": False,
    },
    {
        "number": 25,
        "name": "Pikachu",
        "type_one": "Electric",
        "type_two": "",
        "total": 320,
        "hit_points": 35,
        "attack": 55,
        "defense": 40,
        "special_attack": 50,
        "special_defense": 50,
        "speed": 90,
        "generation": 1,
        "legendary": False,
    },
    {
        "number": 150,
        "name": "Mewtwo",
        "type_one": "Psychic",
        "type_two": "",
        "total": 680,
        "hit_points": 106,
        "attack": 110,
        "defense": 90,
        "special_attack": 154,
        "special_defense": 90,
        "speed": 130,
        "generation": 1,
        "legendary": True,
    },
]


class CopyCountingPokemon(Mapping):
    copy_count = 0

    def __init__(self, row):
        self.row = row

    def __getitem__(self, key):
        return self.row[key]

    def __iter__(self) -> Iterator:
        type(self).copy_count += 1
        return iter(self.row)

    def __len__(self):
        return len(self.row)

    def get(self, key, default=None):
        return self.row.get(key, default)


@pytest.fixture(autouse=True)
def reset_state(monkeypatch):
    monkeypatch.setattr(pokedex_app.db, "get", lambda: list(POKEMON))
    pokemon_service.captured_ids.clear()
    CopyCountingPokemon.copy_count = 0


@pytest.fixture()
def client():
    pokedex_app.app.config.update(TESTING=True)
    return pokedex_app.app.test_client()


def test_pokemon_endpoint_paginates_with_default_sort(client):
    response = client.get("/api/pokemon")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["page"] == 1
    assert payload["pageSize"] == 20
    assert payload["total"] == 5
    assert payload["totalPages"] == 1
    assert payload["hasNext"] is False
    assert [item["name"] for item in payload["items"]][:2] == ["Bulbasaur", "Charmander"]
    assert payload["items"][0]["id"] == "1::Bulbasaur"
    assert payload["items"][0]["captured"] is False
    assert payload["items"][0]["imageUrl"].startswith(
        "https://img.pokemondb.net/sprites/x-y/normal/"
    )


def test_pokemon_endpoint_uses_sprite_urls_that_cover_later_generations(client, monkeypatch):
    treecko = {
        **POKEMON[0],
        "number": 252,
        "name": "Treecko",
        "type_one": "Grass",
        "type_two": "",
        "generation": 3,
    }
    monkeypatch.setattr(pokedex_app.db, "get", lambda: [treecko])

    response = client.get("/api/pokemon")

    assert response.status_code == 200
    assert response.get_json()["items"][0]["imageUrl"] == (
        "https://img.pokemondb.net/sprites/x-y/normal/treecko.png"
    )


@pytest.mark.parametrize(
    ("name", "expected_slug"),
    [
        ("Flabébé", "flabebe"),
        ("Nidoran♀", "nidoran-f"),
        ("Nidoran♂", "nidoran-m"),
        ("Farfetch'd", "farfetchd"),
        ("Mr. Mime", "mr-mime"),
        ("Mime Jr.", "mime-jr"),
    ],
)
def test_sprite_slug_normalizes_special_pokemon_names(name, expected_slug):
    assert pokemon_service.sprite_slug(name) == expected_slug


def test_pokemon_endpoint_normalizes_accented_sprite_urls(client, monkeypatch):
    flabebe = {
        **POKEMON[0],
        "number": 669,
        "name": "Flabébé",
        "type_one": "Fairy",
        "type_two": "",
        "generation": 6,
    }
    monkeypatch.setattr(pokedex_app.db, "get", lambda: [flabebe])

    response = client.get("/api/pokemon")

    assert response.status_code == 200
    assert response.get_json()["items"][0]["imageUrl"] == (
        "https://img.pokemondb.net/sprites/x-y/normal/flabebe.png"
    )


def test_pokemon_endpoint_extracts_form_names_for_mega_sprites(client, monkeypatch):
    charizard = {
        **POKEMON[0],
        "number": 6,
        "name": "Charizard",
        "type_one": "Fire",
        "type_two": "Flying",
    }
    mega_charizard_x = {
        **charizard,
        "name": "CharizardMega Charizard X",
        "type_two": "Dragon",
    }
    monkeypatch.setattr(pokedex_app.db, "get", lambda: [charizard, mega_charizard_x])

    response = client.get("/api/pokemon?pageSize=5")

    assert response.status_code == 200
    items = response.get_json()["items"]
    assert [(item["displayName"], item["imageUrl"]) for item in items] == [
        ("Charizard", "https://img.pokemondb.net/sprites/x-y/normal/charizard.png"),
        ("Mega Charizard X", "https://img.pokemondb.net/sprites/x-y/normal/charizard-mega-x.png"),
    ]


def test_pokemon_endpoint_extracts_form_names_for_other_sprites(client, monkeypatch):
    rotom = {
        **POKEMON[0],
        "number": 479,
        "name": "Rotom",
        "type_one": "Electric",
        "type_two": "Ghost",
    }
    heat_rotom = {
        **rotom,
        "name": "RotomHeat Rotom",
        "type_two": "Fire",
    }
    deoxys_attack = {
        **rotom,
        "number": 386,
        "name": "DeoxysAttack Forme",
        "type_one": "Psychic",
        "type_two": "",
    }
    monkeypatch.setattr(pokedex_app.db, "get", lambda: [deoxys_attack, rotom, heat_rotom])

    response = client.get("/api/pokemon?pageSize=5")

    assert response.status_code == 200
    assert [(item["displayName"], item["imageUrl"]) for item in response.get_json()["items"]] == [
        ("Deoxys Attack Forme", "https://img.pokemondb.net/sprites/x-y/normal/deoxys-attack.png"),
        ("Rotom", "https://img.pokemondb.net/sprites/x-y/normal/rotom.png"),
        ("Heat Rotom", "https://img.pokemondb.net/sprites/x-y/normal/rotom-heat.png"),
    ]


def test_create_app_registers_api_routes():
    app = create_app()
    route_rules = {rule.rule for rule in app.url_map.iter_rules()}

    assert "/api/pokemon" in route_rules
    assert "/api/types" in route_rules
    assert "/api/captured" in route_rules


def test_icon_endpoint_uses_matching_pokemon_sprite_url(client, monkeypatch):
    treecko = {
        **POKEMON[0],
        "number": 252,
        "name": "Treecko",
        "type_one": "Grass",
        "type_two": "",
        "generation": 3,
    }
    monkeypatch.setattr(pokedex_app.db, "get", lambda: [treecko])

    response = client.get("/icon/Treecko")

    assert response.status_code == 200
    assert response.text == "https://img.pokemondb.net/sprites/x-y/normal/treecko.png"


def test_icon_endpoint_accepts_normalized_form_names(client, monkeypatch):
    charizard = {
        **POKEMON[0],
        "number": 6,
        "name": "Charizard",
        "type_one": "Fire",
        "type_two": "Flying",
    }
    mega_charizard_x = {
        **charizard,
        "name": "CharizardMega Charizard X",
        "type_two": "Dragon",
    }
    monkeypatch.setattr(pokedex_app.db, "get", lambda: [charizard, mega_charizard_x])

    response = client.get("/icon/Mega Charizard X")

    assert response.status_code == 200
    assert response.text == "https://img.pokemondb.net/sprites/x-y/normal/charizard-mega-x.png"


def test_icon_endpoint_accepts_accentless_lookup_for_accented_names(client, monkeypatch):
    flabebe = {
        **POKEMON[0],
        "number": 669,
        "name": "Flabébé",
        "type_one": "Fairy",
        "type_two": "",
        "generation": 6,
    }
    monkeypatch.setattr(pokedex_app.db, "get", lambda: [flabebe])

    response = client.get("/icon/Flabebe")

    assert response.status_code == 200
    assert response.text == "https://img.pokemondb.net/sprites/x-y/normal/flabebe.png"


def test_icon_endpoint_returns_404_for_unknown_pokemon(client):
    response = client.get("/icon/DefinitelyNotAPokemon")

    assert response.status_code == 404
    assert response.get_json() == {"error": "pokemon not found"}


def test_pokemon_endpoint_enriches_only_returned_page_items(client, monkeypatch):
    extra_pokemon = {
        **POKEMON[0],
        "number": 7,
        "name": "Squirtle",
        "type_one": "Water",
        "type_two": "",
    }
    icon_calls = []

    monkeypatch.setattr(pokedex_app.db, "get", lambda: POKEMON + [extra_pokemon])
    monkeypatch.setattr(
        pokemon_service,
        "sprite_url",
        lambda sprite_name: icon_calls.append(sprite_name) or f"https://example.test/{sprite_name}.png",
    )

    response = client.get("/api/pokemon?pageSize=5")

    assert response.status_code == 200
    assert response.get_json()["total"] == 6
    assert len(response.get_json()["items"]) == 5
    assert icon_calls == ["Bulbasaur", "Charmander", "Charizard Mega X", "Squirtle", "Pikachu"]


def test_pokemon_endpoint_copies_only_returned_page_items(client, monkeypatch):
    rows = [
        CopyCountingPokemon(
            {
                **POKEMON[0],
                "number": number,
                "name": f"Pokemon {number}",
            }
        )
        for number in range(1, 31)
    ]

    monkeypatch.setattr(pokedex_app.db, "get", lambda: rows)

    response = client.get("/api/pokemon?pageSize=5")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] == 30
    assert len(payload["items"]) == 5
    assert CopyCountingPokemon.copy_count == 5


def test_pokemon_endpoint_reads_live_db_data_between_requests(client, monkeypatch):
    updated_pokemon = {
        **POKEMON[0],
        "number": 7,
        "name": "Squirtle",
        "type_one": "Water",
        "type_two": "",
    }
    snapshots = iter([list(POKEMON), list(POKEMON) + [updated_pokemon]])

    monkeypatch.setattr(pokedex_app.db, "get", lambda: next(snapshots))

    first_response = client.get("/api/pokemon?pageSize=10")
    second_response = client.get("/api/pokemon?pageSize=10")

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert first_response.get_json()["total"] == 5
    assert second_response.get_json()["total"] == 6


def test_pokemon_endpoint_reads_from_db_on_each_request(client, monkeypatch):
    calls = 0

    def fake_get():
        nonlocal calls
        calls += 1
        return list(POKEMON)

    monkeypatch.setattr(pokedex_app.db, "get", fake_get)

    first_response = client.get("/api/pokemon")
    second_response = client.get("/api/pokemon")

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert calls == 2


def test_pokemon_endpoint_sorts_by_number_descending(client):
    response = client.get("/api/pokemon?sort=desc&pageSize=5")

    assert response.status_code == 200
    payload = response.get_json()
    assert [item["number"] for item in payload["items"]] == [150, 25, 6, 4, 1]


def test_pokemon_endpoint_filters_by_primary_or_secondary_type(client):
    response = client.get("/api/pokemon?type=Dragon&pageSize=10")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] == 1
    assert payload["items"][0]["name"] == "CharizardMega Charizard X"


def test_unknown_type_returns_empty_page(client):
    response = client.get("/api/pokemon?type=Cosmic&pageSize=10")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] == 0
    assert payload["items"] == []
    assert payload["hasNext"] is False


def test_fuzzy_search_matches_across_scalar_properties(client):
    response = client.get("/api/pokemon?q=pikchu&pageSize=10")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] == 1
    assert payload["items"][0]["name"] == "Pikachu"


def test_captured_state_persists_for_server_lifetime(client):
    capture = client.patch(
        "/api/captured",
        json={"id": "25::Pikachu", "captured": True},
    )
    assert capture.status_code == 200
    assert capture.get_json() == {"id": "25::Pikachu", "captured": True}

    response = client.get("/api/pokemon?q=Pikachu")
    payload = response.get_json()

    assert payload["items"][0]["captured"] is True


def test_unknown_captured_id_returns_not_found_without_persisting(client):
    response = client.patch(
        "/api/captured",
        json={"id": "999::MissingNo", "captured": True},
    )

    assert response.status_code == 404
    assert response.get_json() == {"error": "pokemon not found"}
    assert "999::MissingNo" not in pokemon_service.captured_ids


def test_invalid_query_params_return_bad_request(client):
    assert client.get("/api/pokemon?page=0").status_code == 400
    assert client.get("/api/pokemon?pageSize=7").status_code == 400
    assert client.get("/api/pokemon?sort=sideways").status_code == 400


def test_types_endpoint_returns_sorted_unique_types(client):
    response = client.get("/api/types")

    assert response.status_code == 200
    assert response.get_json() == {
        "types": ["Dragon", "Electric", "Fire", "Grass", "Poison", "Psychic"]
    }


def test_default_cors_allows_localhost_and_loopback_client_origins(client):
    localhost_response = client.get(
        "/api/types",
        headers={"Origin": "http://localhost:5173"},
    )
    loopback_response = client.get(
        "/api/types",
        headers={"Origin": "http://127.0.0.1:5173"},
    )

    assert localhost_response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert loopback_response.headers["Access-Control-Allow-Origin"] == "http://127.0.0.1:5173"


def test_client_origin_env_supports_comma_separated_values():
    origins = pokedex_app.get_client_origins(
        "http://example.test, http://127.0.0.1:3000",
        "5173",
    )

    assert origins == [
        "http://example.test",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_cors_allows_json_patch_preflight_from_loopback_client(client):
    response = client.options(
        "/api/captured",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "PATCH",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )

    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == "http://127.0.0.1:5173"
    assert "PATCH" in response.headers["Access-Control-Allow-Methods"]
    assert "Content-Type" in response.headers["Access-Control-Allow-Headers"]
