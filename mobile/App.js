import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme';
import JobsScreen from './src/screens/JobsScreen';
import TechScreen from './src/screens/TechScreen';
import GearScreen from './src/screens/GearScreen';
import TakeHomeScreen from './src/screens/TakeHomeScreen';

// 가벼운 골격: 외부 내비게이션 라이브러리 없이 하단 탭만 구현.
// 화면이 늘어나면 @react-navigation/bottom-tabs로 이전하기 쉽게 화면별로 분리해 두었다.
const TABS = [
  { key: 'jobs', label: '직군', icon: '🏆', Screen: JobsScreen },
  { key: 'tech', label: '기술', icon: '💻', Screen: TechScreen },
  { key: 'gear', label: '장비', icon: '⌨️', Screen: GearScreen },
  { key: 'net', label: '실수령', icon: '💰', Screen: TakeHomeScreen },
];

export default function App() {
  const [tab, setTab] = useState('jobs');
  const Active = TABS.find((t) => t.key === tab).Screen;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.logo}>💸 DevPay</Text>
        <Text style={styles.tagline}>개발자 연봉을 한눈에</Text>
      </View>
      <View style={{ flex: 1 }}><Active /></View>
      <View style={styles.tabbar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabIcon, tab === t.key && styles.on]}>{t.icon}</Text>
            <Text style={[styles.tabLabel, tab === t.key && styles.on]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  logo: { color: colors.accent, fontSize: 24, fontWeight: '800' },
  tagline: { color: colors.dim, fontSize: 13, marginTop: 2 },
  tabbar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabIcon: { fontSize: 20, opacity: 0.6 },
  tabLabel: { color: colors.dim, fontSize: 11, marginTop: 2 },
  on: { color: colors.accent, opacity: 1 },
});
