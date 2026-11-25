import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import {
  getCityReport,
  CityReport,
  aqiLabel,
  describeWeather,
  runningSentence,
} from "../api/weather";
import { theme } from "../theme";
import { useProfile } from "../data/useProfile";

// Noms de colonne possibles pour la ville dans la table profile
const CITY_KEYS = ["city", "ville", "town", "home_city", "location"];

function cityFromProfile(values: Record<string, any>): string {
  for (const key of CITY_KEYS) {
    const v = values?.[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

// Noms de colonne possibles pour le seuil AQI dans la table profile
const AQI_KEYS = ["aqi", "max_aqi", "aqi_max", "aqi_threshold", "aqi_limit"];

function aqiFromProfile(values: Record<string, any>): number | null {
  for (const key of AQI_KEYS) {
    const v = values?.[key];
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export default function WeatherScreen() {
  // paused = true : le profil est chargé une fois, sans rafraîchissement toutes les 15 s
  const { profile } = useProfile(15000, true);
  const [city, setCity] = useState(""),
    [report, setReport] = useState<CityReport | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const userTouched = useRef(false);

  const runSearch = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    setLoading(true);
    setError("");
    try {
      setReport(await getCityReport(trimmed));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur météo");
    } finally {
      setLoading(false);
    }
  }, []);

  // Ville du profil par défaut, tant que l'utilisateur n'a rien saisi
  const profileCity = cityFromProfile(profile.values);
  useEffect(() => {
    if (!profileCity || userTouched.current) return;
    setCity(profileCity);
    void runSearch(profileCity);
  }, [profileCity, runSearch]);

  const profileAqi = aqiFromProfile(profile.values);
  const aqiBlocked =
    profileAqi !== null &&
    !!report &&
    report.running.all.length > 0 &&
    report.running.all.every((x) => x.aqi > profileAqi);

  const search = () => {
    userTouched.current = true;
    void runSearch(city);
  };

  const current = report?.meteo.current,
    daily = report?.meteo.daily,
    description = current ? describeWeather(current.weather_code) : null;
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.head}>
        <View>
          <Text style={s.kicker}>CONDITIONS EXTÉRIEURES</Text>
          <Text style={s.title}>Weather</Text>
        </View>
        <Text style={s.mark}>☼</Text>
      </View>
      <View style={s.search}>
        <TextInput
          value={city}
          onChangeText={(t) => {
            userTouched.current = true;
            setCity(t);
          }}
          onSubmitEditing={search}
          returnKeyType="search"
          placeholder="Rechercher une ville"
          placeholderTextColor={theme.colors.muted}
          style={s.input}
        />
        <Pressable style={s.button} onPress={search}>
          {loading ? (
            <ActivityIndicator color={theme.colors.bg} />
          ) : (
            <Text style={s.buttonText}>→</Text>
          )}
        </Pressable>
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
      {report && current && daily && description && (
        <>
          <View style={s.hero}>
            <View style={s.heroTop}>
              <View>
                <Text style={s.city}>{report.lieu.nom}</Text>
                <Text style={s.country}>{report.lieu.pays}</Text>
              </View>
              <Text style={s.weatherIcon}>{description[1]}</Text>
            </View>
            <View style={s.tempRow}>
              <Text style={s.temp}>{Math.round(current.temperature_2m)}°</Text>
              <View>
                <Text style={s.condition}>{description[0]}</Text>
                <Text style={s.feels}>
                  Ressenti {Math.round(current.apparent_temperature)}°
                </Text>
              </View>
            </View>
            <View style={s.minmax}>
              <Text style={s.minmaxText}>
                MAX {Math.round(daily.temperature_2m_max[0])}°
              </Text>
              <Text style={s.minmaxText}>
                MIN {Math.round(daily.temperature_2m_min[0])}°
              </Text>
              <Text style={s.minmaxText}>
                ☂ {daily.precipitation_sum[0]} mm
              </Text>
            </View>
          </View>
          <Text style={s.section}>DANS L’AIR</Text>
          <View style={s.metrics}>
            <Metric
              label="QUALITÉ EAQI"
              value={Math.round(report.air.european_aqi)}
              detail={aqiLabel(report.air.european_aqi)}
            />
            <Metric
              label="VENT"
              value={`${Math.round(current.wind_speed_10m)}`}
              detail="km/h"
            />
            <Metric
              label="HUMIDITÉ"
              value={`${Math.round(current.relative_humidity_2m)}%`}
              detail="relative"
            />
            <Metric
              label="PM₂.₅"
              value={`${Number(report.air.pm2_5).toFixed(1)}`}
              detail="µg/m³"
            />
            <Metric
              label="PM₁₀"
              value={`${Number(report.air.pm10).toFixed(1)}`}
              detail="µg/m³"
            />
            <Metric
              label="CO"
              value={`${Math.round(report.air.carbon_monoxide)}`}
              detail="µg/m³"
            />
          </View>
          <Text style={s.section}>FENÊTRE DE COURSE</Text>
          {aqiBlocked && (
            <View style={s.alert}>
              <Text style={s.alertText}>
                Aucun critère AQI ne satisfait vos standards aujourd'hui pour
                aller courir en extérieur. Vous pouvez modifier votre seuil AQI dans les paramètres de profil.
              </Text>
            </View>
          )}
          <View style={s.running}>
            <Text style={s.runHead}>🏃 MEILLEURS CRÉNEAUX</Text>
            {report.running.best.length ? (
              report.running.best.map((x) => (
                <View key={x.hour} style={s.slot}>
                  <Text style={s.slotTime}>{x.hour}</Text>
                  <View style={s.bar}>
                    <View style={[s.fill, { width: `${x.score}%` }]} />
                  </View>
                  <Text style={s.score}>{x.score}</Text>
                </View>
              ))
            ) : (
              <Text style={s.noSlot}>
                Aucun créneau de jour restant aujourd’hui.
              </Text>
            )}
            <Text style={s.sentence}>{runningSentence(report.running)}</Text>
            {report.running.worst.length > 0 && (
              <Text style={s.worst}>
                À éviter :{" "}
                {report.running.worst
                  .map((x) => `${x.hour} (${x.score}/100)`)
                  .join(" · ")}
              </Text>
            )}
          </View>
          <Text style={s.update}>
            Prévisions Open-Meteo · données non médicales
          </Text>
        </>
      )}
      {!report && !loading && !error && (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>☁</Text>
          <Text style={s.emptyText}>
            Cherchez une ville pour consulter la météo et les meilleures heures
            pour courir.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricDetail}>{detail}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 21, paddingBottom: 30 },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 19,
  },
  kicker: {
    color: theme.colors.accent,
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: "800",
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 4,
  },
  mark: { fontSize: 30, color: theme.colors.accent },
  search: { flexDirection: "row", gap: 9, marginBottom: 17 },
  input: {
    flex: 1,
    backgroundColor: theme.colors.panel,
    color: theme.colors.text,
    paddingHorizontal: 15,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  button: {
    width: 48,
    backgroundColor: theme.colors.accent,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 25, color: theme.colors.bg },
  error: { color: theme.colors.danger, marginBottom: 12 },
  hero: {
    backgroundColor: theme.colors.panel,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  city: { color: theme.colors.text, fontSize: 20, fontWeight: "800" },
  country: { color: theme.colors.muted, fontSize: 11, marginTop: 3 },
  weatherIcon: { fontSize: 42 },
  tempRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginTop: 5,
  },
  temp: {
    color: theme.colors.text,
    fontSize: 61,
    fontWeight: "300",
    letterSpacing: -3,
  },
  condition: { color: theme.colors.text, fontWeight: "700", fontSize: 14 },
  feels: { color: theme.colors.muted, fontSize: 12, marginTop: 4 },
  minmax: {
    flexDirection: "row",
    gap: 17,
    borderTopWidth: 1,
    borderColor: theme.colors.line,
    marginTop: 9,
    paddingTop: 13,
  },
  minmaxText: { color: theme.colors.muted, fontSize: 10, fontWeight: "700" },
  section: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 21,
    marginBottom: 11,
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    width: "31.5%",
    backgroundColor: theme.colors.panel,
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  metricLabel: {
    color: theme.colors.muted,
    fontSize: 8,
    letterSpacing: 0.7,
    fontWeight: "700",
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 7,
  },
  metricDetail: { color: theme.colors.accent, fontSize: 9, marginTop: 2 },
  alert: {
    backgroundColor: "rgba(255, 59, 48, 0.12)",
    borderWidth: 1,
    borderColor: "#FF3B30",
    borderRadius: 14,
    padding: 14,
    marginBottom: 11,
  },
  alertText: {
    color: "#FF3B30",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  running: {
    backgroundColor: theme.colors.panel,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  runHead: {
    color: theme.colors.accent,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "800",
    marginBottom: 13,
  },
  slot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  slotTime: {
    color: theme.colors.text,
    fontSize: 12,
    width: 40,
    fontWeight: "700",
  },
  bar: {
    height: 6,
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderRadius: 9,
    overflow: "hidden",
  },
  fill: { height: 6, backgroundColor: theme.colors.accent, borderRadius: 9 },
  score: {
    width: 23,
    textAlign: "right",
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  sentence: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  worst: {
    color: theme.colors.orange,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 9,
  },
  noSlot: { color: theme.colors.muted, fontSize: 12 },
  update: {
    color: theme.colors.muted,
    fontSize: 9,
    textAlign: "center",
    marginTop: 18,
  },
  empty: { alignItems: "center", marginTop: 70, padding: 22 },
  emptyIcon: { color: theme.colors.accent, fontSize: 43 },
  emptyText: {
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 12,
  },
});