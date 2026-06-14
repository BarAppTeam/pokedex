import os

import db
from backend import create_app
from backend.config import get_client_origins
from backend.pokemon_service import captured_ids, icon_url

app = create_app()


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8080")),
    )
