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

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN ?? "";

const headers: Record<string, string> = {
  "Content-Type": "application/json",
  ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
};

function ensureConfigured() {
  if (!API_URL || !API_TOKEN) {
    throw new Error(
      "API non configurée : EXPO_PUBLIC_API_URL / EXPO_PUBLIC_API_TOKEN manquants",
    );
  }
}

export async function fetchProfile(): Promise<ProfileData> {
  ensureConfigured();
  const res = await fetch(`${API_URL}/profile`, { headers });
  if (!res.ok) throw new Error(`profile ${res.status}`);
  return res.json();
}

export async function saveProfile(
  values: Record<string, any>,
): Promise<ProfileData> {
  ensureConfigured();
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