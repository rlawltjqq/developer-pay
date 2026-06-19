import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { apiGet, apiPost, fmt } from '../api';
import { colors } from '../theme';
import { StateView } from '../components/Screen';

export default function GearScreen() {
  const [type, setType] = useState('keyboard');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [voted, setVoted] = useState({});

  const load = useCallback(() => {
    setData(null); setError(null);
    apiGet(`/gear?type=${type}`).then(setData).catch((e) => setError(e.message));
  }, [type]);

  useEffect(() => { load(); }, [load]);

  async function vote(id) {
    if (voted[id]) return;
    try {
      await apiPost(`/gear/${id}/vote`);
      setVoted((v) => ({ ...v, [id]: true }));
      load();
    } catch (e) { setError(e.message); }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toggle}>
        {['keyboard', 'mouse'].map((t) => (
          <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipOn]}>
            <Text style={[styles.chipText, type === t && styles.chipTextOn]}>{t === 'keyboard' ? '⌨️ 키보드' : '🖱️ 마우스'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <StateView loading={!data && !error} error={error}>
        <FlatList
          data={data?.items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={[styles.rank, item.rank <= 3 && styles.top]}>{item.rank}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>{item.brand} · 📰 HN {fmt(item.mentions_hn)}</Text>
              </View>
              <TouchableOpacity onPress={() => vote(item.id)} disabled={!!voted[item.id]} style={[styles.vote, voted[item.id] && styles.voteOn]}>
                <Text style={styles.voteText}>👍 {fmt(item.votes)}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </StateView>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 16 },
  chipOn: { borderColor: colors.accent },
  chipText: { color: colors.dim },
  chipTextOn: { color: colors.accent, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  rank: { width: 26, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.dim },
  top: { color: colors.gold },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  sub: { color: colors.dim, fontSize: 12, marginTop: 2 },
  vote: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  voteOn: { borderColor: colors.accent2 },
  voteText: { color: colors.text, fontSize: 13 },
});
