from flask import Blueprint, jsonify, request

from .config import ALLOWED_PAGE_SIZES, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, DEFAULT_SORT
from .pokemon_service import get_types, icon_url, list_pokemon, pokemon_exists, set_captured

api = Blueprint("api", __name__)


@api.route("/icon/<name>")
def get_icon_url(name: str):
    url = icon_url(name)
    if url is None:
        return error_response("pokemon not found", 404)

    return url


@api.route("/")
def hello():
    return jsonify(
        {
            "service": "pokedex",
            "endpoints": ["/api/pokemon", "/api/types", "/api/captured"],
        }
    )


@api.route("/api/types")
def get_type_options():
    return jsonify({"types": get_types()})


@api.route("/api/pokemon")
def get_pokemon():
    parsed_query, error = parse_pokemon_query()
    if error:
        return error_response(error)

    return jsonify(list_pokemon(**parsed_query))


@api.route("/api/captured", methods=["PATCH"])
def update_captured():
    payload = request.get_json(silent=True) or {}
    pokemon_identifier = payload.get("id")
    captured = payload.get("captured")

    if not isinstance(pokemon_identifier, str) or not pokemon_identifier:
        return error_response("id must be a non-empty string")
    if not isinstance(captured, bool):
        return error_response("captured must be a boolean")
    if not pokemon_exists(pokemon_identifier):
        return error_response("pokemon not found", 404)

    set_captured(pokemon_identifier, captured)
    return jsonify({"id": pokemon_identifier, "captured": captured})


def parse_pokemon_query() -> tuple[dict | None, str | None]:
    page, page_error = parse_positive_int(
        request.args.get("page"),
        DEFAULT_PAGE,
        "page",
    )
    if page_error:
        return None, page_error

    page_size, page_size_error = parse_positive_int(
        request.args.get("pageSize"),
        DEFAULT_PAGE_SIZE,
        "pageSize",
    )
    if page_size_error:
        return None, page_size_error
    if page_size not in ALLOWED_PAGE_SIZES:
        return None, "pageSize must be one of 5, 10, 20, or 50"

    sort_order = request.args.get("sort", DEFAULT_SORT).lower()
    if sort_order not in {"asc", "desc"}:
        return None, "sort must be either asc or desc"

    return {
        "page": page,
        "page_size": page_size,
        "sort_order": sort_order,
        "type_filter": request.args.get("type", "").strip(),
        "search_query": request.args.get("q", "").strip(),
    }, None


def parse_positive_int(value: str | None, default: int, field_name: str) -> tuple[int | None, str | None]:
    if value is None or value == "":
        return default, None

    try:
        parsed = int(value)
    except ValueError:
        return None, f"{field_name} must be an integer"

    if parsed < 1:
        return None, f"{field_name} must be greater than or equal to 1"

    return parsed, None


def error_response(message: str, status_code: int = 400):
    return jsonify({"error": message}), status_code
