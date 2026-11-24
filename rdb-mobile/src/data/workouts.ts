import AsyncStorage from "@react-native-async-storage/async-storage";
export type WorkoutType =
  "running" | "strength" | "cycling" | "mobility" | "rest" | "other";
export type Intensity = "easy" | "moderate" | "hard" | "";
export interface Workout {
  id: string;
  date: string;
  title: string;
  type: WorkoutType;
  exercise?: string;
  outdoor: boolean;
  startTime?: string;
  durationMin?: number;
  intensity?: Intensity;
  notes?: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
  distanceKm?: number;
  durationSec?: number;
  paceSecPerKm?: number;
  restSec?: number;
  detailNotes?: string;
}
export interface WorkoutRepository {
  list(): Promise<Workout[]>;
  save(w: Workout): Promise<void>;
  remove(id: string): Promise<void>;
}
const KEY = "@rdb/workouts/v1";
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN ?? "";
const headers: Record<string, string> = {
  "Content-Type": "application/json",
  ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
};
async function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  if (!API_URL || !API_TOKEN) throw new Error("API is not configured");
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
}
async function localList(): Promise<Workout[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]") as Workout[];
  } catch {
    return [];
  }
}
async function localSave(w: Workout): Promise<void> {
  const all = await localList();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify([...all.filter((x) => x.id !== w.id), w]),
  );
}
async function localRemove(id: string): Promise<void> {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify((await localList()).filter((w) => w.id !== id)),
  );
}
async function requireSuccess(response: Response): Promise<void> {
  if (!response.ok)
    throw new Error(`Workout API returned HTTP ${response.status}`);
}
/** API-first repository preserving the original exported signatures and mobile Workout payload.
 * The backend maps exercise/detail fields onto workout_item and exercise rows. */
export class LocalWorkoutRepository implements WorkoutRepository {
  async list(): Promise<Workout[]> {
    try {
      const response = await fetchApi("/workouts");
      await requireSuccess(response);
      const workouts = (await response.json()) as Workout[];
      await AsyncStorage.setItem(KEY, JSON.stringify(workouts));
      return workouts;
    } catch {
      return localList();
    }
  }
  async save(w: Workout): Promise<void> {
    // Persist first so an unreachable API never loses a locally created workout.
    await localSave(w);
    try {
      const response = await fetchApi("/workouts", {
        method: "POST",
        body: JSON.stringify(w),
      });
      await requireSuccess(response);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Workout API returned HTTP ")
      )
        throw error;
    }
  }
  async remove(id: string): Promise<void> {
    await localRemove(id);
    try {
      const response = await fetchApi(`/workouts/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (response.status !== 404) await requireSuccess(response);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Workout API returned HTTP ")
      )
        throw error;
    }
  }
}
export const typeLabels: Record<WorkoutType, string> = {
  running: "Course à pied",
  strength: "Musculation",
  cycling: "Vélo",
  mobility: "Mobilité",
  rest: "Repos",
  other: "Autre",
};
export const intensityLabels: Record<Exclude<Intensity, "">, string> = {
  easy: "Facile",
  moderate: "Modérée",
  hard: "Intense",
};
export const formatDuration = (s?: number): string => {
  if (!s) return "";
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    r = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
    : `${m}:${String(r).padStart(2, "0")}`;
};
export const formatDistance = (km?: number): string =>
  !km ? "" : km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
export const formatPace = (s?: number): string =>
  !s ? "" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} /km`;
export const workoutSummary = (w: Workout): string =>
  [
    typeLabels[w.type],
    w.exercise,
    w.durationMin && `${w.durationMin} min`,
    w.distanceKm && formatDistance(w.distanceKm),
    w.intensity && intensityLabels[w.intensity],
  ]
    .filter(Boolean)
    .join(" · ");
