import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Keyboard } from 'react-native';
import { apiGet, fmt } from '../api';
import { colors } from '../theme';

export default function TakeHomeScreen() {
  const [salary, setSalary] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function calc() {
    Keyboard.dismiss();
    const v = Number(salary);
    if (!(v >= 1000)) { setError('연봉을 1,000만원 이상 입력해주세요.'); return; }
    setLoading(true); setError(null);
    try {
      setResult(await apiGet(`/take-home?salary=${v}`));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.caption}>세전 연봉 → 4대보험·소득세 공제 → 월 실수령액 (2025 요율)</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="세전 연봉 (만원)"
          placeholderTextColor={colors.dim}
          keyboardType="number-pad"
          value={salary}
          onChangeText={setSalary}
        />
        <TouchableOpacity style={styles.btn} onPress={calc}>
          <Text style={styles.btnText}>{loading ? '...' : '계산'}</Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.error}>⚠️ {error}</Text>}
      {result && (
        <View>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>월 실수령액</Text>
            <Text style={styles.heroValue}>{fmt(result.net_monthly)}원</Text>
            <Text style={styles.heroSub}>연 {fmt(result.net_annual_manwon)}만원 · 공제율 {result.deduction_rate}%</Text>
          </View>
          {result.breakdown.map((b) => (
            <View key={b.label} style={styles.row}>
              <Text style={styles.rowLabel}>{b.label} <Text style={styles.rowRate}>{b.rate}</Text></Text>
              <Text style={styles.rowVal}>{fmt(b.amount)}원</Text>
            </View>
          ))}
          <Text style={styles.note}>※ {result.note}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  caption: { color: colors.dim, fontSize: 13, marginBottom: 14 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 8, color: colors.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  btn: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 20, justifyContent: 'center' },
  btnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
  error: { color: colors.danger, marginTop: 12 },
  hero: { backgroundColor: colors.card, borderColor: colors.accent, borderWidth: 1, borderRadius: 12, padding: 20, alignItems: 'center', marginTop: 18 },
  heroLabel: { color: colors.dim, fontSize: 13 },
  heroValue: { color: colors.accent, fontSize: 34, fontWeight: '800', marginTop: 4 },
  heroSub: { color: colors.dim, fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 13, marginTop: 8 },
  rowLabel: { color: colors.text, fontSize: 14 },
  rowRate: { color: colors.dim, fontSize: 12 },
  rowVal: { color: colors.text, fontSize: 14, fontWeight: '600' },
  note: { color: colors.dim, fontSize: 11, marginTop: 14, lineHeight: 16 },
});
