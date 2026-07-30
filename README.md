# OpsFlow

## Run Locally

Prerequisites: Node.js and PostgreSQL.

1. Install the frontend and backend dependencies with `npm install` and
   `npm --prefix backend install`.
2. Copy the required environment values into `.env` (`DATABASE_URL`,
   `JWT_SECRET`, and optionally `GEMINI_API_KEY`).
3. Apply the database migration with `npm --prefix backend run db:migrate`.
4. Start the backend with `npm --prefix backend run dev`.
5. In another terminal, start the frontend with `npm run dev`.

The frontend runs on Vite and proxies API requests to the backend on port 4000.

## Production

Build both applications:

```sh
npm run build
npm --prefix backend run build
npm --prefix backend start
```

In production the backend serves the frontend build from `dist/`.
