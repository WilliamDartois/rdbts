# RDB backend

TypeScript / Express API for the existing PostgreSQL training application schema.

## Setup

The database must already have the real tables from the project's `schema_postgres.sql` (`app_user`, `exercise`, `workout`, `workout_item`, etc.). Do **not** apply a legacy `CREATE TABLE` script from this package. Configure a connection string and API token in `.env` (never commit real credentials):

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
API_TOKEN=replace-with-a-long-random-secret
PORT=3000
DEFAULT_USER_ID=1
```

The `DEFAULT_USER_ID` must be an existing `app_user.id`. After the real schema exists, apply the minimal additive compatibility migration once:

```bash
psql "$DATABASE_URL" -f migration.sql
npm install
npm run dev
```

For production: `npm run build && npm start`. The API uses parameterized PostgreSQL queries and `DATABASE_URL`; no database password is embedded in source.

## Workouts API

Routes require `Authorization: Bearer <API_TOKEN>`.

- `GET /workouts?from=YYYY-MM-DD&to=YYYY-MM-DD` — filtered by configured `DEFAULT_USER_ID`, inclusive date bounds.
- `POST /workouts` — upserts the mobile workout by `(user_id, client_id)`.
- `DELETE /workouts/:id` — deletes the matching user's workout (204; 404 when not found).

The mobile contract retains `id/date/title/type/exercise/outdoor/startTime/durationMin/intensity/notes/sets/reps/weightKg/distanceKm/durationSec/paceSecPerKm/restSec/detailNotes`. The API maps these onto `workout`, its first `workout_item` (position 1), and `exercise`. `distanceKm` converts to/from `target_distance_m` (rounded to the nearest metre). A submitted exercise name is linked to a matching common/personal exercise; if none exists, a personal `exercise` catalog row is created. Mobile `id` is kept in the additive `workout.client_id` column while the database's identity `workout.id` remains authoritative. GET serializes one item per workout because the mobile model represents one exercise/detail block.
