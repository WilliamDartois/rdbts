import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { Pool, type PoolClient } from 'pg';

const port = Number(process.env.PORT ?? 3000);
const apiToken = process.env.API_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
const userId = Number(process.env.DEFAULT_USER_ID ?? 1);
if (!apiToken) throw new Error('API_TOKEN must be set');
if (!databaseUrl) throw new Error('DATABASE_URL must be set');
if (!Number.isSafeInteger(userId) || userId < 1) throw new Error('DEFAULT_USER_ID must be a positive integer');

const pool = new Pool({ connectionString: databaseUrl });
const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const supplied = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!supplied || supplied !== apiToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
app.use('/workouts', authenticate);
app.use('/profile', authenticate);

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const optionalDate = (value: unknown): value is string => typeof value === 'string' && datePattern.test(value);
const workoutTypes = ['running', 'strength', 'cycling', 'mobility', 'rest', 'other'];
// Real workout.type has no enum/check, so preserve 'other' as plain text.
const databaseType = (type: string): string => type;
const intensities = ['easy', 'moderate', 'hard'];
const optionalNumber = (value: unknown): number | null | undefined => {
  if (value === undefined || value === null || value === '') return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};
const optionalText = (value: unknown): string | null | undefined => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};
const toNumber = (value: unknown): number | undefined => value == null ? undefined : Number(value);

const workoutSelect = `
  SELECT w.id, w.client_id, w.workout_date, w.title, w.type, w.is_outdoor,
         w.planned_start, w.planned_duration_min, w.intensity, w.status, w.notes,
         wi.target_sets, wi.target_reps, wi.target_weight_kg,
         wi.target_distance_m, wi.target_duration_s, wi.target_pace_s_per_km,
         wi.rest_s, wi.notes AS detail_notes, e.name AS exercise
  FROM workout AS w
  LEFT JOIN LATERAL (
    SELECT item.* FROM workout_item AS item
    WHERE item.workout_id = w.id ORDER BY item.position LIMIT 1
  ) AS wi ON TRUE
  LEFT JOIN exercise AS e ON e.id = wi.exercise_id`;
function toWorkout(row: Record<string, any>) {
  return {
    id: String(row.client_id ?? row.id),
    date: row.workout_date instanceof Date ? row.workout_date.toISOString().slice(0, 10) : String(row.workout_date).slice(0, 10),
    title: row.title,
    type: row.type,
    exercise: row.exercise ?? undefined,
    outdoor: row.is_outdoor,
    startTime: row.planned_start == null ? undefined : String(row.planned_start).slice(0, 5),
    durationMin: row.planned_duration_min ?? undefined,
    intensity: row.intensity ?? '',
    notes: row.notes ?? undefined,
    sets: row.target_sets ?? undefined,
    reps: row.target_reps ?? undefined,
    weightKg: toNumber(row.target_weight_kg),
    distanceKm: row.target_distance_m == null ? undefined : Number(row.target_distance_m) / 1000,
    durationSec: row.target_duration_s ?? undefined,
    paceSecPerKm: row.target_pace_s_per_km ?? undefined,
    restSec: row.rest_s ?? undefined,
    detailNotes: row.detail_notes ?? undefined,
  };
}

app.get('/workouts', async (req, res, next): Promise<void> => {
  try {
    const from = req.query.from;
    const to = req.query.to;
    if ((from !== undefined && !optionalDate(from)) || (to !== undefined && !optionalDate(to))) {
      res.status(400).json({ error: 'from and to must use YYYY-MM-DD' });
      return;
    }
    const params: unknown[] = [userId];
    let sql = `${workoutSelect} WHERE w.user_id = $1`;
    if (from !== undefined) { params.push(from); sql += ` AND w.workout_date >= $${params.length}`; }
    if (to !== undefined) { params.push(to); sql += ` AND w.workout_date <= $${params.length}`; }
    sql += ' ORDER BY w.workout_date, w.planned_start, w.id';
    const result = await pool.query(sql, params);
    res.json(result.rows.map(toWorkout));
  } catch (error) { next(error); }
});

app.post('/workouts', async (req, res, next): Promise<void> => {
  const w = req.body as Record<string, unknown> | null;
  if (!w || typeof w !== 'object' || typeof w.id !== 'string' || !w.id.trim() ||
      !optionalDate(w.date) || typeof w.title !== 'string' || !w.title.trim() ||
      typeof w.type !== 'string' || !workoutTypes.includes(w.type) || typeof w.outdoor !== 'boolean') {
    res.status(400).json({ error: 'Invalid workout: id, date, title, type, and outdoor are required' });
    return;
  }
  const startTime = optionalText(w.startTime);
  const notes = optionalText(w.notes);
  const detailNotes = optionalText(w.detailNotes);
  const intensity = w.intensity === '' || w.intensity == null ? null : w.intensity;
  const durationMin = optionalNumber(w.durationMin);
  const sets = optionalNumber(w.sets);
  const reps = optionalNumber(w.reps);
  const weightKg = optionalNumber(w.weightKg);
  const distanceKm = optionalNumber(w.distanceKm);
  const durationSec = optionalNumber(w.durationSec);
  const paceSecPerKm = optionalNumber(w.paceSecPerKm);
  const restSec = optionalNumber(w.restSec);
  const exercise = optionalText(w.exercise);
  const invalidNumbers = [
    [durationMin, 1, 2147483647, true],
    [sets, 1, 32767, true], [reps, 1, 32767, true],
    [weightKg, 0, 9999.99, false], [distanceKm, 0, 2147483.647, false],
    [durationSec, 0, 2147483647, true], [paceSecPerKm, 1, 2147483647, true],
    [restSec, 0, 2147483647, true],
  ].some(([value, min, max, integer]) => typeof value === 'number' &&
    (value < (min as number) || value > (max as number) ||
     (integer === true && !Number.isInteger(value))));
  if ([startTime, notes, detailNotes, durationMin, sets, reps, weightKg, distanceKm,
       durationSec, paceSecPerKm, restSec, exercise].includes(undefined) ||
      (intensity !== null && (typeof intensity !== 'string' || !intensities.includes(intensity))) ||
      (typeof startTime === 'string' && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(startTime)) ||
      invalidNumbers) {
    res.status(400).json({ error: 'Invalid optional workout field' });
    return;
  }

  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO workout
         (client_id, user_id, workout_date, title, type, is_outdoor, planned_start,
          planned_duration_min, intensity, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'planned',$10)
       ON CONFLICT (user_id, client_id) WHERE client_id IS NOT NULL
       DO UPDATE SET workout_date=EXCLUDED.workout_date, title=EXCLUDED.title,
         type=EXCLUDED.type, is_outdoor=EXCLUDED.is_outdoor,
         planned_start=EXCLUDED.planned_start, planned_duration_min=EXCLUDED.planned_duration_min,
         intensity=EXCLUDED.intensity, status='planned', notes=EXCLUDED.notes
       RETURNING id`,
      [w.id.trim(), userId, w.date, w.title.trim(), databaseType(w.type), w.outdoor, startTime ?? null, durationMin ?? null, intensity, notes ?? null]
    );
    const workoutId: string = result.rows[0].id;
    const hasItem = Boolean(exercise || sets != null || reps != null || weightKg != null ||
      distanceKm != null || durationSec != null || paceSecPerKm != null || restSec != null || detailNotes);
    if (!hasItem) {
      await client.query('DELETE FROM workout_item WHERE workout_id = $1 AND position = 1', [workoutId]);
    } else {
      let exerciseId: string | null = null;
      if (exercise) {
        const found = await client.query(
          `SELECT id FROM exercise WHERE lower(name)=lower($1)
             AND (user_id IS NULL OR user_id=$2)
           ORDER BY (user_id=$2) DESC NULLS LAST LIMIT 1`, [exercise.trim(), userId]
        );
        if (found.rowCount) exerciseId = found.rows[0].id;
        else {
          const inserted = await client.query(
            `INSERT INTO exercise (user_id, name, category, is_outdoor)
             VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
            [userId, exercise.trim(), databaseType(w.type), w.outdoor]
          );
          if (inserted.rowCount) exerciseId = inserted.rows[0].id;
          else {
            const retry = await client.query(
              `SELECT id FROM exercise WHERE lower(name)=lower($1)
                 AND (user_id IS NULL OR user_id=$2)
               ORDER BY (user_id=$2) DESC NULLS LAST LIMIT 1`, [exercise.trim(), userId]
            );
            if (retry.rowCount) exerciseId = retry.rows[0].id;
          }
        }
      }
      const itemValues = [workoutId, exerciseId, sets ?? null, reps ?? null, weightKg ?? null,
        distanceKm == null ? null : Math.round(distanceKm * 1000), durationSec ?? null, paceSecPerKm ?? null, restSec ?? null, detailNotes ?? null];
      // workout_item.uq_item_position is DEFERRABLE, so PostgreSQL disallows
      // using it as an ON CONFLICT arbiter. Replace position 1 transactionally.
      await client.query('DELETE FROM workout_item WHERE workout_id=$1 AND position=1', [workoutId]);
      await client.query(
        `INSERT INTO workout_item
           (workout_id, exercise_id, position, target_sets, target_reps, target_weight_kg,
            target_distance_m, target_duration_s, target_pace_s_per_km, rest_s, notes)
         VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10)`,
        itemValues
      );
    }
    const saved = await client.query(`${workoutSelect} WHERE w.id=$1 AND w.user_id=$2`, [workoutId, userId]);
    await client.query('COMMIT');
    res.status(201).json(toWorkout(saved.rows[0]));
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    next(error);
  } finally { client?.release(); }
});

app.delete('/workouts/:id', async (req, res, next): Promise<void> => {
  try {
    const result = await pool.query(
      `DELETE FROM workout WHERE user_id=$1 AND
         (client_id=$2 OR (client_id IS NULL AND id::text=$2)) RETURNING id`,
      [userId, req.params.id]
    );
    if (!result.rowCount) { res.status(404).json({ error: 'Workout not found' }); return; }
    res.status(204).send();
  } catch (error) { next(error); }
});

// Colonnes que l'app ne doit jamais modifier
const PROTECTED = new Set(["id", "user_id", "created_at", "updated_at"]);

async function getProfileColumns() {
  const { rows } = await pool.query(
    `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profile'
      ORDER BY ordinal_position`,
  );
  return rows.map((c) => ({
    name: c.column_name as string,
    type: c.data_type as string,
    nullable: c.is_nullable === "YES",
    editable: !PROTECTED.has(c.column_name),
  }));
}

app.get("/profile", async (_req, res, next) => {
  try {
    const columns = await getProfileColumns();
    const { rows } = await pool.query("SELECT * FROM profile WHERE user_id = $1", [userId]);
    res.json({ columns, values: rows[0] ?? {} });
  } catch (error) { next(error); }
});

app.put("/profile", async (req, res, next) => {
  try {
    const columns = await getProfileColumns();
    const editable = columns.filter((c) => c.editable).map((c) => c.name);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const keys = Object.keys(body).filter((k) => editable.includes(k));
    if (keys.length === 0) {
      res.status(400).json({ error: "no_fields" });
      return;
    }
    const colSql = keys.map((k) => `"${k}"`).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 2}`).join(", ");
    const updateSql = keys.map((k) => `"${k}" = EXCLUDED."${k}"`).join(", ");
    const hasUpdatedAt = columns.some((c) => c.name === "updated_at");
    const values = keys.map((k) => (body[k] === "" ? null : body[k]));

    const { rows } = await pool.query(
      `INSERT INTO profile (user_id, ${colSql})
       VALUES ($1, ${placeholders})
       ON CONFLICT (user_id) DO UPDATE SET ${updateSql}${hasUpdatedAt ? ", updated_at = now()" : ""}
       RETURNING *`,
      [userId, ...values],
    );
    res.json({ columns, values: rows[0] ?? {} });
  } catch (error) { next(error); }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});
const server = app.listen(port, '0.0.0.0', () => console.log(`RDB API listening on 0.0.0.0:${port}`));
async function shutdown(): Promise<void> { server.close(); await pool.end(); }
process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });


