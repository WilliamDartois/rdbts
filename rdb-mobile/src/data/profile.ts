export type ProfileColumn = {
  name: string;
  type: string; // type PostgreSQL : text, integer, numeric, boolean, date...
  nullable: boolean;
  editable: boolean;
};

export type ProfileData = {
  columns: ProfileColumn[];
  values: Record<string, any>;
};

export const EMPTY_PROFILE: ProfileData = { columns: [], values: {} };

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_TOKEN}`,
};

export async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch(`${API_URL}/profile`, { headers });
  if (!res.ok) throw new Error(`profile ${res.status}`);
  return res.json();
}

export async function saveProfile(
  values: Record<string, any>,
): Promise<ProfileData> {
  const res = await fetch(`${API_URL}/profile`, {
    method: "PUT",
    headers,
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error(`profile ${res.status}`);
  return res.json();
}

// "max_hr" -> "Max hr"
export function labelOf(name: string) {
  const s = name.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}