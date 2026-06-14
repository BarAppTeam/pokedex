# Pokédex

Fullstack Pokédex exercise with a Flask API and a React + TypeScript client.

## Environment

Copy the example environment if you want to override defaults:

```bash
cp .env.example .env
cp client/.env.example client/.env
```

Defaults:

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`
- Frontend dev API calls use Vite's same-origin proxy by default, so `VITE_API_BASE_URL` can stay empty.

## Make Commands

Install backend and frontend dependencies:

```bash
make install
```

Run the Flask API:

```bash
make backend
```

Run the React client in another terminal:

```bash
make frontend
```

Run all tests:

```bash
make test
```

Build the frontend:

```bash
make build
```

## Backend

Structure:

- `app.py` is the Flask entrypoint.
- `backend/__init__.py` creates the Flask app and registers extensions/routes.
- `backend/routes.py` owns HTTP request parsing and responses.
- `backend/pokemon_service.py` owns filtering, sorting, fuzzy search, enrichment, and captured state.
- `backend/config.py` owns API defaults and CORS origin configuration.

Available endpoints:

- `GET /api/pokemon?page=1&pageSize=20&sort=asc&type=Fire&q=pika`
- `GET /api/types`
- `PATCH /api/captured` with `{ "id": "25::Pikachu", "captured": true }`
- `GET /icon/<name>`

Direct backend commands, if you do not want to use Make:

```bash
python3 -m pip install -r requirements.txt
python3 app.py
python3 -m pytest tests/test_app.py -q
```

## Frontend

Direct frontend commands, if you do not want to use Make:

```bash
cd client
npm install
npm run dev
npm run build
npm test
```

The client uses relative API URLs by default. During Vite development, `/api` and `/icon` are proxied to `http://127.0.0.1:8080`.
Set `VITE_API_BASE_URL` only if you intentionally want the browser to call a different backend origin directly.

```bash
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

## Notes

- `db.py` is unchanged and still represents the provided DB abstraction.
- Backend API reads call the provided `db.get()` abstraction for each request so live DB changes made during the server lifetime are reflected without relying on `pokemon_db.json` internals.
- Captured Pokémon are stored in memory and persist until the Flask process restarts.
- Pagination, sorting, type filtering, and fuzzy search are performed by the backend so the client does not fetch the entire live DB. Because the provided DB abstraction exposes only `db.get()`, each request still reads the current DB snapshot, then selects the requested sorted page window without copying, sorting, or enriching every matching row.
- Infinite scroll stores the current page in the URL, so refreshing reloads pages from `1` through the current page.
