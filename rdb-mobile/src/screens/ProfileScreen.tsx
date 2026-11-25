import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { theme } from "../theme";
import { ProfileColumn, labelOf, saveProfile } from "../data/profile";
import { useProfile } from "../data/useProfile";

const NUMERIC = ["integer", "smallint", "bigint", "numeric", "real", "double precision"];
const INTEGER = ["integer", "smallint", "bigint"];

export default function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { profile, loading, refresh } = useProfile();
  const [form, setForm] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Resynchronise avec la base tant que l'utilisateur n'a rien modifié
  useEffect(() => {
    if (!dirty) setForm(profile.values);
  }, [profile, dirty]);

  const set = (name: string, value: any) => {
    setDirty(true);
    setForm((f) => ({ ...f, [name]: value }));
  };

  const fields = profile.columns.filter((c) => c.editable);

  const onSave = async () => {
    const payload: Record<string, any> = {};
    for (const c of fields) {
      let v = form[c.name];
      if (v === undefined || v === null || v === "") {
        if (!c.nullable) continue; // on n'envoie pas une valeur vide sur une colonne NOT NULL
        payload[c.name] = null;
        continue;
      }
      if (NUMERIC.includes(c.type)) v = Number(v);
      payload[c.name] = v;
    }
    setSaving(true);
    try {
      await saveProfile(payload);
      setDirty(false);
      await refresh();
      Alert.alert("Profil enregistré", "Vos modifications ont été sauvegardées.");
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer le profil.");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (c: ProfileColumn) => {
    const value = form[c.name];

    if (c.type === "boolean") {
      return (
        <Switch
          value={!!value}
          onValueChange={(v) => set(c.name, v)}
          trackColor={{ true: theme.colors.accent }}
        />
      );
    }

    const numeric = NUMERIC.includes(c.type);
    return (
      <TextInput
        style={s.input}
        value={value === null || value === undefined ? "" : String(value)}
        onChangeText={(t) => {
          if (!numeric) return set(c.name, t);
          // entiers : chiffres seulement ; décimaux : chiffres, point et virgule
          const clean = INTEGER.includes(c.type)
            ? t.replace(/[^0-9]/g, "")
            : t.replace(",", ".").replace(/[^0-9.]/g, "");
          set(c.name, clean);
        }}
        keyboardType={numeric ? "numeric" : "default"}
        placeholder={c.type === "date" ? "AAAA-MM-JJ" : labelOf(c.name)}
        placeholderTextColor={theme.colors.muted}
        multiline={c.type === "text"}
      />
    );
  };

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: "center" }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 23, paddingBottom: 60 }}>
        <Pressable onPress={onBack}>
          <Text style={s.back}>‹ Retour</Text>
        </Pressable>
        <Text style={s.kicker}>PROFIL SPORTIF</Text>
        <Text style={s.title}>Mon profil</Text>

        {fields.length === 0 && (
          <Text style={s.empty}>
            Aucune donnée de profil disponible. Vérifiez la connexion à l'API.
          </Text>
        )}

        {fields.map((c) => (
          <View key={c.name}>
            <Text style={s.label}>{labelOf(c.name)}</Text>
            {renderField(c)}
          </View>
        ))}

        <Pressable style={s.save} onPress={onSave} disabled={saving || !dirty}>
          {saving ? (
            <ActivityIndicator color={theme.colors.bg} />
          ) : (
            <Text style={s.saveText}>Enregistrer</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  back: { color: theme.colors.accent, fontWeight: "700", fontSize: 14, marginTop: 8 },
  kicker: {
    color: theme.colors.accent,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "800",
    marginTop: 20,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 5,
    marginBottom: 10,
  },
  empty: { color: theme.colors.muted, marginTop: 20 },
  label: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 7,
  },
  input: {
    backgroundColor: theme.colors.panel,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 15,
  },
  save: {
    marginTop: 26,
    backgroundColor: theme.colors.accent,
    borderRadius: 15,
    padding: 16,
    alignItems: "center",
  },
  saveText: { color: theme.colors.bg, fontWeight: "900", fontSize: 15 },
});