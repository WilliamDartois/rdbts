import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";
export default function PlaceholderScreen({
  name,
}: {
  name: "GARMIN" | "STRAVA";
}) {
  const garmin = name === "GARMIN";
  return (
    <View style={s.root}>
      <View style={s.symbol}>
        <Text style={s.glyph}>{garmin ? "⌁" : "↗"}</Text>
      </View>
      <Text style={s.kicker}>CONNEXION À VENIR</Text>
      <Text style={s.title}>{garmin ? "Garmin Connect" : "Strava"}</Text>
      <Text style={s.body}>
        La page {garmin ? "Garmin" : "Strava"} de l’application source ne
        contenait pas encore de fonctions actives. Cette intégration pourra être
        ajoutée ici.
      </Text>
      <View style={s.line} />
      <Text style={s.small}>RDB · RUNNING MANAGEMENT</Text>
    </View>
  );
}
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 34,
  },
  symbol: {
    width: 78,
    height: 78,
    borderRadius: 27,
    backgroundColor: theme.colors.panel2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  glyph: { fontSize: 37, color: theme.colors.accent },
  kicker: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.accent,
    fontWeight: "800",
  },
  title: {
    fontSize: 29,
    color: theme.colors.text,
    fontWeight: "800",
    marginTop: 9,
  },
  body: {
    textAlign: "center",
    color: theme.colors.muted,
    lineHeight: 21,
    fontSize: 13,
    marginTop: 11,
  },
  line: {
    height: 1,
    width: 70,
    backgroundColor: theme.colors.line,
    marginTop: 26,
    marginBottom: 14,
  },
  small: { color: theme.colors.muted, fontSize: 9, letterSpacing: 1.5 },
});
