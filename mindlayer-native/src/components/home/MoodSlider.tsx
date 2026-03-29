import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../../utils/theme';
import { getMoodScore } from '../../utils/constants';

const SEGMENTS = [
  { score: -2, label: 'Very Low',  emoji: '😞', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
  { score: -1, label: 'Low',       emoji: '😕', color: '#f97316', bg: '#fff7ed', border: '#fdba74' },
  { score:  0, label: 'Okay',      emoji: '😐', color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' },
  { score:  1, label: 'Good',      emoji: '🙂', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' },
  { score:  2, label: 'Great',     emoji: '😄', color: '#10b981', bg: '#f0fdf4', border: '#6ee7b7' },
];

const SCORE_TO_VALUE: Record<number, number> = { '-2': 8, '-1': 25, '0': 50, '1': 70, '2': 92 };

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export default function MoodSlider({ value, onChange }: Props) {
  const activeScore = getMoodScore(value);
  const active = SEGMENTS.find(s => s.score === activeScore)!;

  return (
    <View style={styles.wrap}>
      {/* Active mood pill */}
      <View style={[styles.activePill, { backgroundColor: active.bg, borderColor: active.border }]}>
        <Text style={styles.activeEmoji}>{active.emoji}</Text>
        <View>
          <Text style={[styles.activeLabel, { color: active.color }]}>{active.label}</Text>
          <Text style={styles.activeScore}>
            {activeScore > 0 ? `+${activeScore}` : activeScore} · Mood score
          </Text>
        </View>
      </View>

      {/* Segment track */}
      <View style={styles.track}>
        {SEGMENTS.map(({ score, emoji, label, color, bg, border }) => {
          const isActive = score === activeScore;
          return (
            <TouchableOpacity
              key={score}
              style={[styles.seg, isActive && { backgroundColor: bg, borderColor: border }]}
              onPress={() => onChange(SCORE_TO_VALUE[score])}
              activeOpacity={0.7}
            >
              <Text style={styles.segEmoji}>{emoji}</Text>
              <Text style={[styles.segLabel, isActive && { color, fontWeight: '700' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },

  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...shadow.sm,
  },
  activeEmoji: { fontSize: 28 },
  activeLabel: { fontSize: 16, fontWeight: '700' },
  activeScore: { fontSize: 11, color: colors.text3, marginTop: 1 },

  track: { flexDirection: 'row', gap: 6 },
  seg: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg2,
  },
  segEmoji: { fontSize: 18 },
  segLabel: {
    fontSize: 9,
    color: colors.text3,
    textAlign: 'center',
    fontWeight: '500',
  },
});
