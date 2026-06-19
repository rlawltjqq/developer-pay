import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';

// 로딩/에러/빈 상태를 공통 처리하는 래퍼
export function Center({ children }) {
  return <View style={styles.center}>{children}</View>;
}

export function StateView({ loading, error, children }) {
  if (loading) return <Center><ActivityIndicator color={colors.accent} size="large" /></Center>;
  if (error) return <Center><Text style={styles.error}>⚠️ {error}</Text></Center>;
  return children;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: colors.danger, textAlign: 'center' },
});
