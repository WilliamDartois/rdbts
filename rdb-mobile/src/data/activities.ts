const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN ?? "";

export interface Activity { id: number; name: string }
export interface ExerciseOption {
  /** Primary key of the workout_item_exercice row returned by the catalog endpoint. */
  id: number;
  name: string;
  /** Activity-type label; POST resolves it within the selected activity. */
  typeName: string;
}

async function get<T>(path: string): Promise<T> {
  if (!API_URL || !API_TOKEN) throw new Error("API is not configured");
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`API returned HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const fetchActivities = () => get<Activity[]>("/activities");
export const fetchExercises = (activityId: number) =>
  get<ExerciseOption[]>(`/activities/${activityId}/exercises`);
