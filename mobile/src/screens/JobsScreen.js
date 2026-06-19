import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { apiGet, fmt } from '../api';
import { colors } from '../theme';
import { StateView } from '../components/Screen';

export default function JobsScreen() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    apiGet('/jobs').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <StateView loading={!data && !error} error={error}>
      <FlatList
        data={data}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setOpen(open === item.id ? null : item.id)}>
            <View style={styles.head}>
              <Text style={[styles.rank, item.rank <= 3 && styles.top]}>{item.rank}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.icon} {item.name}</Text>
                <Text style={styles.sub}>{item.tech.slice(0, 3).join(' · ')}</Text>
              </View>
              <Text style={styles.value}>{fmt(item.avg_salary)}만</Text>
            </View>
            {open === item.id && (
              <View style={styles.detail}>
                <Text style={styles.detailLabel}>🛠️ 기술  <Text style={styles.detailText}>{item.tech.join(', ')}</Text></Text>
                <Text style={styles.detailLabel}>🎒 장비  <Text style={styles.detailText}>{item.gear.join(', ')}</Text></Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </StateView>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { width: 28, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.dim },
  top: { color: colors.gold },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  sub: { color: colors.dim, fontSize: 12, marginTop: 2 },
  value: { color: colors.text, fontSize: 16, fontWeight: '700' },
  detail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 },
  detailLabel: { color: colors.dim, fontSize: 13 },
  detailText: { color: colors.text },
});
