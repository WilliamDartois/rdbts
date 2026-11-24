import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CalendarView } from "../components/CalendarView";
import { WorkoutForm } from "../components/WorkoutForm";
import { Workout, WorkoutRepository } from "../data/workouts";
import { theme } from "../theme";
export default function PgmScreen({
  repository,
}: {
  repository: WorkoutRepository;
}) {
  const [workouts, setWorkouts] = useState<Workout[]>([]),
    [selected, setSelected] = useState(""),
    [formDate, setFormDate] = useState(""),
    [form, setForm] = useState(false);
  const refresh = async () => setWorkouts(await repository.list());
  useEffect(() => {
    void refresh();
  }, []);
  const save = async (w: Workout) => {
    await repository.save(w);
    await refresh();
  };
  const remove = async (w: Workout) => {
    await repository.remove(w.id);
    await refresh();
  };
  return (
    <View style={s.root}>
      <CalendarView
        workouts={workouts}
        onSelect={setSelected}
        onLongPress={(d) => {
          setFormDate(d);
          setForm(true);
        }}
        onDelete={remove}
      />
      <WorkoutForm
        visible={form}
        date={formDate}
        onClose={() => setForm(false)}
        onSave={save}
      />
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
});
