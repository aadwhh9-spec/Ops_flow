# OpsFlow

## Local setup

Requirements:

- Node.js 20 or newer
- PostgreSQL

### 1. Install dependencies

```sh
npm run install:all
```

### 2. Configure the backend

Copy `backend/.env.example` to `backend/.env`, then set at least:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/opsflow
JWT_SECRET=replace-with-a-long-random-secret
OWNER_OPEN_ID=admin@example.com
```

`OWNER_OPEN_ID` must match the email of the account that should receive the
administrator role. Do not commit the real `.env` file.

### 3. Create the database tables

```sh
npm --prefix backend run db:migrate
```

### 4. Run the application

Start the backend in one terminal:

```sh
npm run dev:backend
```

Start the frontend in another terminal:

```sh
npm run dev:frontend
```

Open `http://localhost:5173`. The frontend proxies `/api` requests to the
backend at `http://localhost:4000`.

### 5. Create the first account

Register using the email configured in `OWNER_OPEN_ID`. That account receives
the admin role from the database. Other newly registered accounts receive the
staff role.

## Common problems

- `Missing required environment variable: DATABASE_URL`: create
  `backend/.env` from the example file.
- Login works but no data appears: run the database migration and verify that
  both terminals are still running.
- `401 Invalid email or password`: the account is not registered in the
  connected database or the password is incorrect.
- The frontend opens but API calls fail: confirm the backend is running on port
  `4000` and visit `http://localhost:4000/health`.

## Validation

```sh
npm run check:all
npm test
npm run build:all
```

## Production

Set production environment variables in `backend/.env`, then run:

```sh
npm run build:all
npm --prefix backend start
```

The backend serves the built frontend in production.
