# eval-mobile

Mobile-first 42 evaluation and availability manager built with SvelteKit.

## Development

Copy `.env.example` to `.env`, fill in the 42 OAuth values and a long random
`SESSION_SECRET`, then run:

```sh
docker compose up -d valkey
bun install
bun run dev
```

Set `PUBLIC_USE_MOCK_DATA=true` for local fixtures. With the default `false`,
slots and bookable projects are read from the authenticated 42 API. Live slots
are cached for 30 seconds, bookable teams for two minutes, the current user for
15 minutes, and campus settings for six hours.

## NAS deployment

```sh
cp .env.example .env
# edit .env
docker compose up -d --build
```

The app is exposed on `APP_PORT` (default `3000`) and Valkey is only available
inside the `eval-mobile` Docker network. To add Caddy later, attach its service
to the external network named `eval-mobile` and proxy to `app:3000`.

Set `APP_BIND_ADDRESS=127.0.0.1` if the app should only be reachable through a
reverse proxy running on the same NAS.

## Validation

```sh
bun run check
bun run lint
bun run build
```

GitHub Actions runs those commands and builds the Docker image on every push and
pull request.
