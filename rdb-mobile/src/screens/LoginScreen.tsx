import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { theme } from "../theme";
export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [login, setLogin] = useState(""),
    [password, setPassword] = useState("");
  return (
    <ImageBackground
      source={require("../../assets/wallpaper.jpg")}
      resizeMode="cover"
      style={s.bg}
    >
      <View style={s.overlay}>
        <View style={s.logo}>
          <Text style={s.monogram}>
            R<Text style={{ color: theme.colors.accent }}>D</Text>B
          </Text>
          <View style={s.rule} />
          <Text style={s.tag}>RUN · DISCOVER · BECOME</Text>
        </View>
        <View style={s.form}>
          <Text style={s.kicker}>VOTRE ESPACE PERSONNEL</Text>
          <Text style={s.title}>L’aventure commence ici.</Text>
          <Text style={s.intro}>
            Organisez vos entraînements et trouvez le bon moment pour courir.
          </Text>
          <TextInput
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            placeholder="IDENTIFIANT"
            placeholderTextColor={theme.colors.muted}
            style={s.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="MOT DE PASSE"
            secureTextEntry
            placeholderTextColor={theme.colors.muted}
            style={s.input}
          />
          <Pressable style={s.button} onPress={onLogin}>
            <Text style={s.buttonText}>ENTRER DANS L’ESPACE →</Text>
          </Pressable>
          <Text style={s.note}>
            Mode local · aucune connexion serveur requise
          </Text>
        </View>
        <Text style={s.foot}>RDB · RUNNING MANAGEMENT</Text>
      </View>
    </ImageBackground>
  );
}
const s = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 27,
    paddingTop: 70,
    paddingBottom: 30,
    backgroundColor: "#0b1512b8",
  },
  logo: { alignItems: "center" },
  monogram: {
    fontSize: 62,
    fontWeight: "900",
    letterSpacing: 7,
    color: "#F3F2E8",
  },
  rule: {
    height: 2,
    width: 65,
    backgroundColor: theme.colors.accent,
    marginTop: 4,
  },
  tag: { fontSize: 9, color: "#d6dfce", letterSpacing: 3, marginTop: 10 },
  form: {
    backgroundColor: "#111d19ee",
    padding: 23,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#65735e",
    marginTop: 30,
  },
  kicker: {
    color: theme.colors.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    marginTop: 10,
  },
  intro: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#1c2922",
    color: theme.colors.text,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.line,
    fontSize: 12,
    letterSpacing: 1,
  },
  button: {
    backgroundColor: theme.colors.accent,
    padding: 16,
    alignItems: "center",
    borderRadius: 13,
    marginTop: 5,
  },
  buttonText: {
    color: theme.colors.bg,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  note: {
    color: theme.colors.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 14,
  },
  foot: {
    color: "#d5dfd1",
    fontSize: 8,
    letterSpacing: 2,
    textAlign: "center",
  },
});
