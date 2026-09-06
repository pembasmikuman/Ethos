import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { getDb, type Exercise } from '../db';
import { colors } from '../lib/theme';

export default function Home() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDb()
      .then((db) => db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY primary_muscle, name'))
      .then(setExercises)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Ethos' }} />
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={exercises}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.primary_muscle} · {item.target_rep_min}–{item.target_rep_max} reps · {item.default_rest_seconds}s
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  card: { backgroundColor: colors.card, borderRadius: 10, padding: 14, marginBottom: 8 },
  name: { color: colors.text, fontSize: 17, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 4 },
  error: { color: '#EF4444', padding: 12 },
});
