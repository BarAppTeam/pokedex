import os

ALLOWED_PAGE_SIZES = {5, 10, 20, 50}
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20
DEFAULT_SORT = "asc"


def get_client_origins(
    client_origin: str | None = None,
    client_port: str | None = None,
) -> list[str]:
    port = client_port or os.getenv("CLIENT_PORT", "5173")
    configured_origin = client_origin if client_origin is not None else os.getenv("CLIENT_ORIGIN")
    default_origins = [
        f"http://localhost:{port}",
        f"http://127.0.0.1:{port}",
    ]

    if configured_origin:
        configured_origins = [
            origin.strip()
            for origin in configured_origin.split(",")
            if origin.strip()
        ]
        return list(dict.fromkeys(configured_origins + default_origins))

    return default_origins
