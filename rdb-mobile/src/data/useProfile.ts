import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { EMPTY_PROFILE, ProfileData, fetchProfile } from "./profile";

export function useProfile(intervalMs = 15000, paused = false) {
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setProfile(await fetchProfile());
    } catch (e) {
      console.warn("profile refresh failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (paused) return;
    const timer = setInterval(refresh, intervalMs);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh, intervalMs, paused]);

  return { profile, loading, refresh };
}