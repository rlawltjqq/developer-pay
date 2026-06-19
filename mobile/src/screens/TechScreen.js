import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { apiGet, fmt } from '../api';
import { colors } from '../theme';
import { StateView } from '../components/Screen';

export default function TechScreen() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/tech').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <StateView loading={!data && !error} error={error}>
      <FlatList
        data={data}
        keyExtractor={(i) => i.name}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={<Text style={styles.caption}>기술스택·언어별 평균 연봉 (점핏 2025)</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.rank, item.rank <= 3 && styles.top]}>{item.rank}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.field}</Text>
            </View>
            <Text style={styles.value}>{fmt(item.salary)}만</Text>
          </View>
        )}
      />
    </StateView>
  );
}

const styles = StyleSheet.create({
  caption: { color: colors.dim, fontSize: 13, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  rank: { width: 28, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.dim },
  top: { color: colors.gold },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  sub: { color: colors.dim, fontSize: 12, marginTop: 2 },
  value: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
