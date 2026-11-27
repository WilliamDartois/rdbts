import React, { useEffect, useState } from "react";
import {
  Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet, Switch,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Workout, WorkoutExercise, Intensity, intensityLabels } from "../data/workouts";
import { Activity, ExerciseOption, fetchActivities, fetchExercises } from "../data/activities";
import { theme } from "../theme";

function Field({ label, value, onChange, placeholder, keyboardType = "default" }: {
  label: string; value: string; onChange: (s: string) => void; placeholder?: string;
  keyboardType?: "default" | "numeric";
}) {
  return <View style={{ marginBottom: 12 }}>
    <Text style={s.fieldLabel}>{label}</Text>
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder ?? "—"}
      placeholderTextColor={theme.colors.muted} keyboardType={keyboardType} style={s.input} />
  </View>;
}
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[s.chip, selected && s.chipOn]}>
    <Text style={[s.chipText, selected && { color: theme.colors.bg }]}>{label}</Text>
  </Pressable>;
}
export function WorkoutForm({ visible, date, onClose, onSave }: {
  visible: boolean; date: string; onClose: () => void; onSave: (w: Workout) => void;
}) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [activity, setActivity] = useState<Activity | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseOption[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<ExerciseOption[]>([]);
  const [loadingEx, setLoadingEx] = useState(false);
  const [outdoor, setOutdoor] = useState(true);
  const [useTime, setUseTime] = useState(false);
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState<Intensity>("");
  const [notes, setNotes] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [distance, setDistance] = useState("");
  const [detailDuration, setDetailDuration] = useState("");
  const [pace, setPace] = useState("");
  const [rest, setRest] = useState("");
  const [detailNotes, setDetailNotes] = useState("");

  useEffect(() => {
    if (visible) fetchActivities().then(setActivities).catch(() => setActivities([]));
  }, [visible]);

  const pickActivity = async (a: Activity) => {
    setActivity(a);
    setSelectedExercises([]);
    setExerciseOptions([]);
    setLoadingEx(true);
    try { setExerciseOptions(await fetchExercises(a.id)); }
    catch { setExerciseOptions([]); }
    finally { setLoadingEx(false); }
  };
  const toggleExercise = (exercise: ExerciseOption) => {
    setSelectedExercises((current) => current.some((e) => e.id === exercise.id)
      ? current.filter((e) => e.id !== exercise.id) : [...current, exercise]);
  };
  const reset = () => {
    setStep(1); setTitle(""); setActivity(null); setExerciseOptions([]); setSelectedExercises([]);
    setOutdoor(true); setUseTime(false); setTime("18:00"); setDuration(""); setIntensity("");
    setNotes(""); setSets(""); setReps(""); setWeight(""); setDistance("");
    setDetailDuration(""); setPace(""); setRest(""); setDetailNotes("");
  };
  const close = () => { reset(); onClose(); };
  const num = (v: string) => { const n = Number(v); return v.trim() && Number.isFinite(n) && n > 0 ? n : undefined; };
  const save = () => {
    if (!title.trim()) return;
    const common: Partial<WorkoutExercise> = {
      sets: num(sets), reps: num(reps), weightKg: num(weight), distanceKm: num(distance),
      durationSec: num(detailDuration), paceSecPerKm: num(pace), restSec: num(rest),
      notes: detailNotes.trim() || undefined,
    };
    const exercises: WorkoutExercise[] = selectedExercises.map((e) => ({
      activityId: activity!.id, typeName: e.typeName, name: e.name, exerciseId: e.id, exercise: e.name, ...common,
    }));
    onSave({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date, title: title.trim(),
      activityId: activity?.id, outdoor, startTime: useTime ? time : undefined,
      durationMin: num(duration), intensity, notes: notes.trim() || undefined, exercises,
    });
    close();
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
    <View style={s.scrim}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.wrap}>
        <View style={s.modal}>
          <View style={s.handle} />
          <View style={s.head}>
            <View>
              <Text style={s.eyebrow}>NOUVELLE SÉANCE · {step === 1 ? "01" : "02"}/2</Text>
              <Text style={s.title}>{step === 1 ? "La séance" : "Objectifs"}</Text>
              <Text style={s.sub}>{date.split("-").reverse().join("/")}</Text>
            </View>
            <Pressable onPress={close}><Text style={s.close}>✕</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 18 }}>
            {step === 1 ? <>
              <Field label="Titre *" value={title} onChange={setTitle} placeholder="Ex. : Footing endurance" />
              <Text style={s.fieldLabel}>ACTIVITÉ</Text>
              <View style={s.chips}>
                {activities.length === 0 ? <Text style={s.sub}>Aucune activité disponible</Text> : activities.map((a) =>
                  <Chip key={a.id} label={a.name} selected={activity?.id === a.id} onPress={() => pickActivity(a)} />)}
              </View>
              {activity && <>
                <Text style={s.fieldLabel}>EXERCICES · SÉLECTION MULTIPLE</Text>
                {loadingEx ? <Text style={[s.sub, { marginBottom: 16 }]}>Chargement…</Text>
                  : exerciseOptions.length === 0 ? <Text style={[s.sub, { marginBottom: 16 }]}>Aucun exercice pour cette activité</Text>
                  : <View style={s.chips}>{exerciseOptions.map((e) =>
                    <Chip key={e.id} label={e.name} selected={selectedExercises.some((x) => x.id === e.id)} onPress={() => toggleExercise(e)} />)}</View>}
                {!!selectedExercises.length && <Text style={[s.sub, { marginBottom: 12 }]}>{selectedExercises.length} exercice(s) sélectionné(s)</Text>}
              </>}
              <View style={s.switchRow}><Text style={s.fieldLabel}>Séance en extérieur</Text>
                <Switch value={outdoor} onValueChange={setOutdoor} trackColor={{ true: theme.colors.accentDark }} thumbColor={outdoor ? theme.colors.accent : theme.colors.muted} /></View>
              <View style={s.switchRow}><Text style={s.fieldLabel}>Définir une heure</Text>
                <Switch value={useTime} onValueChange={setUseTime} trackColor={{ true: theme.colors.accentDark }} thumbColor={useTime ? theme.colors.accent : theme.colors.muted} /></View>
              {useTime && <Field label="HEURE (HH:MM)" value={time} onChange={setTime} placeholder="18:00" />}
              <Field label="DURÉE PRÉVUE · MIN" value={duration} onChange={setDuration} keyboardType="numeric" />
              <Text style={s.fieldLabel}>INTENSITÉ</Text>
              <View style={s.chips}>{(["easy", "moderate", "hard"] as const).map((i) =>
                <Chip key={i} label={intensityLabels[i]} selected={intensity === i} onPress={() => setIntensity(intensity === i ? "" : i)} />)}</View>
              <Field label="NOTES" value={notes} onChange={setNotes} placeholder="Une précision…" />
            </> : <>
              <Text style={s.summary}>{title} · {selectedExercises.map((e) => e.name).join(", ") || "Sans exercice associé"}</Text>
              <View style={s.two}><View style={{ flex: 1 }}><Field label="SÉRIES" value={sets} onChange={setSets} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Field label="RÉPÉTITIONS" value={reps} onChange={setReps} keyboardType="numeric" /></View></View>
              <View style={s.two}><View style={{ flex: 1 }}><Field label="CHARGE · KG" value={weight} onChange={setWeight} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Field label="DISTANCE · KM" value={distance} onChange={setDistance} keyboardType="numeric" /></View></View>
              <View style={s.two}><View style={{ flex: 1 }}><Field label="DURÉE · SECONDES" value={detailDuration} onChange={setDetailDuration} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Field label="ALLURE · SEC/KM" value={pace} onChange={setPace} keyboardType="numeric" /></View></View>
              <Field label="REPOS ENTRE SÉRIES · SEC" value={rest} onChange={setRest} keyboardType="numeric" />
              <Field label="NOTES" value={detailNotes} onChange={setDetailNotes} placeholder="Détails des exercices…" />
            </>}
          </ScrollView>
          <View style={s.actions}>
            {step === 2 && <Pressable style={s.back} onPress={() => setStep(1)}><Text style={s.backText}>← Retour</Text></Pressable>}
            <Pressable disabled={!title.trim()} style={[s.primary, !title.trim() && { opacity: 0.45 }]} onPress={() => step === 1 ? setStep(2) : save()}>
              <Text style={s.primaryText}>{step === 1 ? "Continuer →" : "Enregistrer la séance"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0009" },
  wrap: { maxHeight: "95%" },
  modal: {
    backgroundColor: theme.colors.panel,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: 24,
    maxHeight: "100%",
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: theme.colors.line,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 22,
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "800",
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 6,
  },
  sub: { color: theme.colors.muted, marginTop: 3 },
  close: { color: theme.colors.muted, fontSize: 21, padding: 6 },
  fieldLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "800",
    marginBottom: 7,
  },
  input: {
    backgroundColor: theme.colors.bg,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 16,
    marginTop: 5,
  },
  chip: {
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.line,
    borderWidth: 1,
    borderRadius: 99,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  chipOn: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  chipText: { color: theme.colors.muted, fontSize: 12, fontWeight: "600" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    backgroundColor: theme.colors.bg,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 4,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 10 },
  primary: {
    backgroundColor: theme.colors.accent,
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    flex: 1,
  },
  primaryText: { color: theme.colors.bg, fontWeight: "900" },
  back: { paddingHorizontal: 14, justifyContent: "center" },
  backText: { color: theme.colors.text },
  summary: {
    color: theme.colors.accent,
    backgroundColor: theme.colors.bg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
  },
  two: { flexDirection: "row", gap: 10 },
});