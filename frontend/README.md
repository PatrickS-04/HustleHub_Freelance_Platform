# HustleHub+ Frontend

The React single-page app for HustleHub+, built with Vite. It gives clients, freelancers and admins their own dashboard and talks to the API in [`../API`](../API). The full project documentation, including the security decisions, is in the [main README](../README.md).

## Requirements

- Node.js 22+ (needed by the tests; the app itself runs on 20+)
- The API running on `https://localhost:3443`, with its certificate in `../API/certs` - the dev server reuses it, so complete the API setup first

## Running

```bash
npm install
npm run dev
```

The app is served at `https://localhost:5173`. The browser warns about the self-signed certificate; open `https://localhost:3443/health` once and accept it there too, otherwise requests to the API are blocked.

An optional `.env` file in this folder can set:

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `https://localhost:3443` | Where the API is |
| `VITE_IDLE_MINUTES` | `15` | Minutes of inactivity before the user is signed out |

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server over HTTPS with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the production build with the strict Content-Security-Policy |
| `npm run lint` | Lints with Oxlint |
| `npm test` | Vitest in watch mode |
| `npm run test:run` | Runs the tests once (used by CI) |

A captured test run is in [test-results/vitest-run.txt](test-results/vitest-run.txt).

## Structure

```
src/
├── App.jsx                # Session restore, login/register switch
├── services/api.js        # API client (cookie auth, safe error messages)
├── hooks/useIdleLogout.js # Inactivity timeout
├── components/            # Forms, dashboard shell, dialogs, charts
├── screens/               # One screen per dashboard tab
└── utils/                 # Password rule, month helpers
```

## Docker

[Dockerfile](Dockerfile) is a multi-stage build: the app is built with Node, then served by nginx over HTTPS using [nginx.conf.template](nginx.conf.template). It is started with the rest of the stack from the repository root - see the [main README](../README.md#docker).
