import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors, radius, shadow } from '../utils/theme';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function InsightsScreen() {
  const { moodLog, journalEntries, streakDays } = useApp();

  const last7 = useMemo(() => {
    const days: { label: string; score: number | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toDateString();
      const entry = moodLog.find(e => e.date === key);
      days.push({ label: WEEK_DAYS[d.getDay()], score: entry ? entry.score : null });
    }
    return days;
  }, [moodLog]);

  const avgMood = useMemo(() => {
    const valid = last7.filter(d => d.score !== null);
    if (!valid.length) return null;
    const avg = valid.reduce((s, d) => s + (d.score ?? 0), 0) / valid.length;
    return avg.toFixed(1);
  }, [last7]);

  const dominantThemes = useMemo(() => {
    const counts: Record<string, number> = {};
    journalEntries.slice(0, 20).forEach(e => {
      if (e.dominantEmotion) counts[e.dominantEmotion] = (counts[e.dominantEmotion] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion, count]) => ({ emotion, count }));
  }, [journalEntries]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Insights</Text>

        {/* Streak Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Streak</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakNum}>{streakDays}</Text>
            <Text style={styles.streakLabel}>{streakDays === 1 ? 'day' : 'days'} in a row</Text>
          </View>
          <Text style={styles.cardHint}>Keep checking in daily to grow your streak.</Text>
        </View>

        {/* 7-day Mood */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>7-Day Mood</Text>
            {avgMood && <Text style={styles.avgBadge}>Avg {avgMood}/10</Text>}
          </View>
          <View style={styles.chartRow}>
            {last7.map((d, i) => {
              const height = d.score !== null ? Math.max(8, (d.score / 10) * 80) : 6;
              const barColor = d.score !== null
                ? d.score >= 7 ? colors.green : d.score >= 4 ? colors.accent : colors.red
                : colors.border;
              return (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height, backgroundColor: barColor }]} />
                  </View>
                  <Text style={styles.barLabel}>{d.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Dominant themes */}
        {dominantThemes.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top Themes</Text>
            {dominantThemes.map(({ emotion, count }) => (
              <View key={emotion} style={styles.themeRow}>
                <Text style={styles.themeLabel}>{emotion}</Text>
                <View style={styles.themeBarWrap}>
                  <View
                    style={[
                      styles.themeBar,
                      { width: `${(count / dominantThemes[0].count) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.themeCount}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.flex]}>
            <Text style={styles.statNum}>{journalEntries.length}</Text>
            <Text style={styles.statLabel}>Journal entries</Text>
          </View>
          <View style={[styles.statCard, styles.flex]}>
            <Text style={styles.statNum}>{moodLog.length}</Text>
            <Text style={styles.statLabel}>Mood logs</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 20 },
  card: {
    backgroundColor: colors.bg1,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  cardHint: { fontSize: 12, color: colors.text3, marginTop: 4 },
  streakRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  streakNum: { fontSize: 40, fontWeight: '800', color: colors.accent },
  streakLabel: { fontSize: 16, color: colors.text2, fontWeight: '500' },
  avgBadge: {
    fontSize: 12,
    color: colors.accent,
    backgroundColor: colors.accentLt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    fontWeight: '600',
    overflow: 'hidden',
  },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { height: 80, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '70%', borderRadius: 4, minHeight: 6 },
  barLabel: { fontSize: 10, color: colors.text3, marginTop: 4 },
  themeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  themeLabel: { width: 90, fontSize: 13, color: colors.text2, textTransform: 'capitalize' },
  themeBarWrap: { flex: 1, height: 8, backgroundColor: colors.bg3, borderRadius: 4, overflow: 'hidden' },
  themeBar: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  themeCount: { width: 24, fontSize: 12, color: colors.text3, textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNum: { fontSize: 28, fontWeight: '700', color: colors.accent },
  statLabel: { fontSize: 12, color: colors.text3, marginTop: 2, textAlign: 'center' },
  flex: { flex: 1 },
});
