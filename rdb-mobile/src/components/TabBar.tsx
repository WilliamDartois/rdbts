import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { theme } from "../theme";
const tabs = [
  ["PGM", "◷"],
  ["WEATHER", "☼"],
  ["GARMIN", "⌁"],
  ["STRAVA", "↗"],
  ["SETTINGS", "⚙"],
] as const;
export function TabBar({
  active,
  onChange,
}: {
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.bar}>
      {tabs.map(([id, icon]) => (
        <Pressable key={id} onPress={() => onChange(id)} style={s.item}>
          <Text style={[s.icon, active === id && s.sel]}>{icon}</Text>
          <Text style={[s.label, active === id && s.sel]}>{id}</Text>
          {active === id && <View style={s.dot} />}
        </Pressable>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#17221C",
    borderTopWidth: 1,
    borderColor: theme.colors.line,
    paddingTop: 9,
    paddingBottom: 7,
    justifyContent: "space-around",
  },
  item: { alignItems: "center", minWidth: 55 },
  icon: { fontSize: 20, color: theme.colors.muted },
  label: {
    fontSize: 9,
    letterSpacing: 1,
    color: theme.colors.muted,
    marginTop: 2,
  },
  sel: { color: theme.colors.accent },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
    marginTop: 3,
  },
});
