import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { theme } from "../theme";
import ProfileScreen from "./ProfileScreen";
import { useProfile } from "../data/useProfile";

export default function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  const [showProfile, setShowProfile] = useState(false);
  // Se rafraîchit depuis la table profile (en pause quand l'écran d'édition est ouvert).
  const { profile } = useProfile(15000, showProfile);

  if (showProfile) {
    return <ProfileScreen onBack={() => setShowProfile(false)} />;
  }

const firstName = String(profile.values.first_name ?? "").trim();
const initial = firstName ? firstName.charAt(0).toUpperCase() : "R";

  return (
    <View style={s.root}>
      <Text style={s.kicker}>PRÉFÉRENCES</Text>
      <Text style={s.title}>Paramètres</Text>
      <Pressable
        style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}
        onPress={() => setShowProfile(true)}
      >
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>Profil sportif</Text>
          <Text style={s.sub}>
            {firstName ? firstName : "Compléter mon profil"}
          </Text>
        </View>
        <Text style={s.chev}>›</Text>
      </Pressable>
      <View style={s.note}>
        <Text style={s.noteTitle}>Données sur cet appareil</Text>
        <Text style={s.noteText}>
          Vos séances sont conservées localement dans l’espace de stockage de
          l’application.
        </Text>
      </View>
      <Pressable
        style={s.logout}
        onPress={() =>
          Alert.alert(
            "Se déconnecter",
            "Souhaitez-vous vraiment vous déconnecter ?",
            [
              { text: "Annuler", style: "cancel" },
              {
                text: "Se déconnecter",
                style: "destructive",
                onPress: onLogout,
              },
            ],
          )
        }
      >
        <Text style={s.logoutText}>Se déconnecter</Text>
        <Text style={s.logoutArrow}>↗</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, padding: 23 },
  kicker: {
    color: theme.colors.accent,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "800",
    marginTop: 15,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 5,
    marginBottom: 25,
  },
  card: {
    backgroundColor: theme.colors.panel,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: theme.colors.bg, fontSize: 22, fontWeight: "900" },
  name: { color: theme.colors.text, fontWeight: "800", fontSize: 15 },
  sub: { color: theme.colors.muted, fontSize: 11, marginTop: 3 },
  chev: { color: theme.colors.muted, fontSize: 24 },
  note: {
    marginTop: 17,
    padding: 17,
    borderRadius: 17,
    backgroundColor: theme.colors.panel2,
  },
  noteTitle: { color: theme.colors.text, fontWeight: "700", fontSize: 13 },
  noteText: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  logout: {
    marginTop: 24,
    backgroundColor: "#2a201f",
    borderRadius: 15,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  logoutText: { color: theme.colors.danger, fontWeight: "700" },
  logoutArrow: { color: theme.colors.danger, fontSize: 17 },
});