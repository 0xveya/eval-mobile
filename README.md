# eval-mobile

## Self-host

1. Point a domain at the server.
2. Create a 42 OAuth application with your callback URL and the `projects` scope.
3. Copy `.env.example` to `.env` and fill in the OAuth values and `SESSION_SECRET`.
4. Keep `PUBLIC_USE_MOCK_DATA=false` for real 42 data.
5. Run `docker compose up -d --build`.

## Develop

Use `PUBLIC_USE_MOCK_DATA=true` for local fixtures, then run:

```sh
docker compose up -d valkey
bun install
bun run dev
```

Mock slot changes persist locally. With mock mode disabled, opening and closing slots uses the
authenticated 42 API.
