import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { Pool, type PoolClient } from 'pg';

const port = Number(process.env.PORT ?? 3000);
const token = process.env.API_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
const userId = Number(process.env.DEFAULT_USER_ID ?? 1);
if (!token) throw new Error('API_TOKEN must be set');
if (!databaseUrl) throw new Error('DATABASE_URL must be set');
if (!Number.isSafeInteger(userId) || userId < 1) throw new Error('DEFAULT_USER_ID must be a positive integer');
const pool = new Pool({ connectionString: databaseUrl });
const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));
function authenticate(req: Request, res: Response, next: NextFunction): void {
  const supplied = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!supplied || supplied !== token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  next();
}
app.use('/workouts', authenticate);
app.use('/activities', authenticate);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (v: unknown): v is string => typeof v === 'string' && datePattern.test(v);
const optionalText = (v: unknown): string | null | undefined => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') return undefined;
  return v.trim() || null;
};
const optionalNumber = (v: unknown): number | null | undefined => {
  if (v == null || v === '') return null;
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
};
const asNum = (v: unknown): number | undefined => v == null ? undefined : Number(v);
// Assumption: workout_item_exercice.workout_item_id links each exercise row to workout_item.id.
const workoutSelect = `
 SELECT w.id, w.client_id, w.workout_date, w.title, w.planned_start,
        w.planned_duration_min, w.intensity, w.notes,
        wi.id AS item_id, e.activity_type_id, t.activity_id, t.name AS activity_type_name,
        e.id AS exercise_id, e.name AS exercise_name,
        e.target_sets, e.target_reps, e.target_weight_kg,
        e.target_distance_m, e.target_duration_s, e.target_pace_s_per_km,
        e.rest_s, e.notes AS exercise_notes
 FROM workout w
 LEFT JOIN workout_item wi ON wi.workout_id = w.id
 LEFT JOIN workout_item_exercice e ON e.workout_item_id = wi.id
 LEFT JOIN activity_type t ON t.id = e.activity_type_id`;
function mapWorkouts(rows: Record<string, any>[]) {
  const byId = new Map<string, Record<string, any>>();
  for (const r of rows) {
    const id = String(r.client_id ?? r.id);
    let w = byId.get(id);
    if (!w) {
      w = { id, date: r.workout_date instanceof Date ? r.workout_date.toISOString().slice(0, 10) : String(r.workout_date).slice(0, 10),
        title: r.title, startTime: r.planned_start == null ? undefined : String(r.planned_start).slice(0, 5),
        durationMin: r.planned_duration_min ?? undefined, intensity: r.intensity ?? undefined,
        notes: r.notes ?? undefined, exercises: [] as Record<string, unknown>[] };
      byId.set(id, w);
    }
    if (r.item_id != null) w.exercises.push({
      activityId: r.activity_id == null ? undefined : Number(r.activity_id),
      typeName: r.activity_type_name ?? undefined,
      activityTypeId: r.activity_type_id == null ? undefined : Number(r.activity_type_id),
      exerciseId: r.exercise_id == null ? undefined : Number(r.exercise_id),
      name: r.exercise_name ?? undefined, exercise: r.exercise_name ?? undefined, sets: r.target_sets ?? undefined, reps: r.target_reps ?? undefined,
      weightKg: asNum(r.target_weight_kg), distanceKm: r.target_distance_m == null ? undefined : Number(r.target_distance_m) / 1000,
      durationSec: r.target_duration_s ?? undefined, paceSecPerKm: r.target_pace_s_per_km ?? undefined,
      restSec: r.rest_s ?? undefined, notes: r.exercise_notes ?? undefined,
    });
  }
  return [...byId.values()];
}

app.get('/activities', async (_req, res, next): Promise<void> => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM activity ORDER BY name, id');
    res.json(rows.map((r) => ({ id: Number(r.id), name: r.name })));
  } catch (e) { next(e); }
});
app.get('/activities/:id/exercises', async (req, res, next): Promise<void> => {
  const activityId = Number(req.params.id);
  if (!Number.isSafeInteger(activityId) || activityId < 1) { res.status(400).json({ error: 'Invalid activity id' }); return; }
  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.name, t.name AS "typeName"
         FROM workout_item_exercice e
         JOIN activity_type t ON t.id = e.activity_type_id
        WHERE t.activity_id = $1
        ORDER BY t.name, e.name`, [activityId]);
    res.json(rows.map((r) => ({ id: Number(r.id), name: r.name, typeName: r.typeName })));
  } catch (e) { next(e); }
});
app.get('/workouts', async (req, res, next): Promise<void> => {
  try {
    const from = req.query.from, to = req.query.to;
    if ((from !== undefined && !validDate(from)) || (to !== undefined && !validDate(to))) {
      res.status(400).json({ error: 'from and to must use YYYY-MM-DD' }); return;
    }
    const params: unknown[] = [userId];
    let sql = `${workoutSelect} WHERE w.user_id = $1`;
    if (from !== undefined) { params.push(from); sql += ` AND w.workout_date >= $${params.length}`; }
    if (to !== undefined) { params.push(to); sql += ` AND w.workout_date <= $${params.length}`; }
    sql += ' ORDER BY w.workout_date, w.planned_start, w.id, wi.id';
    const { rows } = await pool.query(sql, params);
    res.json(mapWorkouts(rows));
  } catch (e) { next(e); }
});

// Each exercise is stored as its own workout_item + workout_item_exercice association.
app.post('/workouts', async (req, res, next): Promise<void> => {
  const w = req.body as Record<string, unknown> | null;
  if (!w || typeof w !== 'object' || typeof w.id !== 'string' || !w.id.trim() ||
      !validDate(w.date) || typeof w.title !== 'string' || !w.title.trim()) {
    res.status(400).json({ error: 'id, date, and title are required' }); return;
  }
  const startTime = optionalText(w.startTime);
  const duration = optionalNumber(w.durationMin);
  const intensity = optionalText(w.intensity);
  const notes = optionalText(w.notes);
  const exercises = w.exercises === undefined ? [] : w.exercises;
  if (startTime === undefined || duration === undefined || intensity === undefined || notes === undefined ||
      !Array.isArray(exercises) || (duration !== null && (!Number.isInteger(duration) || duration < 1)) ||
      (typeof startTime === 'string' && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(startTime)) ||
      (intensity !== null && !['easy', 'moderate', 'hard'].includes(intensity))) {
    res.status(400).json({ error: 'Invalid optional workout field' }); return;
  }
  const activityId = optionalNumber(w.activityId);
  const normalized = [] as Array<{activityId:number; typeName:string; name:string; sets:number|null; reps:number|null; weight:number|null; distance:number|null; seconds:number|null; pace:number|null; rest:number|null; notes:string|null}>;
  for (const item of exercises as Record<string, unknown>[]) {
    const typeName = optionalText(item?.typeName);
    const name = optionalText(item?.name ?? item?.exercise);
    const sets = optionalNumber(item?.sets), reps = optionalNumber(item?.reps), weight = optionalNumber(item?.weightKg);
    const distance = optionalNumber(item?.distanceKm), seconds = optionalNumber(item?.durationSec);
    const pace = optionalNumber(item?.paceSecPerKm), rest = optionalNumber(item?.restSec), itemNotes = optionalText(item?.notes);
    if (activityId === undefined || !Number.isSafeInteger(activityId) || activityId < 1 ||
        typeName === undefined || !typeName || name === undefined || !name ||
        [sets,reps,weight,distance,seconds,pace,rest,itemNotes].includes(undefined)) {
      res.status(400).json({ error: 'Each exercise needs activityId, typeName, and name' }); return;
    }
    normalized.push({ activityId, typeName, name, sets: sets as number|null, reps: reps as number|null,
      weight: weight as number|null, distance: distance as number|null, seconds: seconds as number|null, pace: pace as number|null,
      rest: rest as number|null, notes: itemNotes as string|null });
  }
  let client: PoolClient | undefined;
  try {
    client = await pool.connect(); await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO workout (client_id,user_id,workout_date,title,planned_start,planned_duration_min,intensity,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id,client_id) WHERE client_id IS NOT NULL
       DO UPDATE SET workout_date=EXCLUDED.workout_date,title=EXCLUDED.title,planned_start=EXCLUDED.planned_start,
         planned_duration_min=EXCLUDED.planned_duration_min,intensity=EXCLUDED.intensity,notes=EXCLUDED.notes
       RETURNING id`,
      [w.id.trim(),userId,w.date,w.title.trim(),startTime,duration,intensity,notes]);
    const id = result.rows[0].id;
    // Replace child associations transactionally so retries are idempotent and lists stay in sync.
    await client.query('DELETE FROM workout_item WHERE workout_id=$1',[id]);
    for (const x of normalized) {
      const typeResult = await client.query(
        'SELECT id FROM activity_type WHERE activity_id=$1 AND name=$2 ORDER BY id LIMIT 1', [x.activityId, x.typeName]);
      if (!typeResult.rowCount) throw new Error(`Activity type not found for ${x.typeName}`);
      const item = await client.query('INSERT INTO workout_item (workout_id) VALUES ($1) RETURNING id',[id]);
      await client.query(
        `INSERT INTO workout_item_exercice
          (workout_item_id,activity_type_id,name,target_sets,target_reps,target_weight_kg,target_distance_m,target_duration_s,target_pace_s_per_km,rest_s,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [item.rows[0].id,typeResult.rows[0].id,x.name,x.sets,x.reps,x.weight,
         x.distance == null ? null : Math.round(x.distance*1000),x.seconds,x.pace,x.rest,x.notes]);
    }
    const saved = await client.query(`${workoutSelect} WHERE w.id=$1 AND w.user_id=$2 ORDER BY wi.id`,[id,userId]);
    await client.query('COMMIT'); res.status(201).json(mapWorkouts(saved.rows)[0]);
  } catch (e) { if (client) await client.query('ROLLBACK').catch(()=>undefined); next(e); }
  finally { client?.release(); }
});
app.use((e: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(e); res.status(500).json({ error: 'Internal server error' });
});
const server = app.listen(port,'0.0.0.0',()=>console.log(`RDB API listening on 0.0.0.0:${port}`));
async function shutdown(): Promise<void> { server.close(); await pool.end(); }
process.on('SIGINT',()=>{void shutdown();}); process.on('SIGTERM',()=>{void shutdown();});
