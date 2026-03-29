import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../context/AppContext';
import { colors, radius, shadow } from '../utils/theme';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { userProfile, streakDays, journalEntries, moodLog } = useApp();

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {userProfile?.name ? userProfile.name[0].toUpperCase() : '?'}
            </Text>
          </View>
          {userProfile?.name && <Text style={styles.displayName}>{userProfile.name}</Text>}
          {user?.email && <Text style={styles.email}>{user.email}</Text>}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.flex]}>
            <Text style={styles.statNum}>{streakDays}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>
          <View style={[styles.statCard, styles.flex]}>
            <Text style={styles.statNum}>{journalEntries.length}</Text>
            <Text style={styles.statLabel}>Entries</Text>
          </View>
          <View style={[styles.statCard, styles.flex]}>
            <Text style={styles.statNum}>{moodLog.length}</Text>
            <Text style={styles.statLabel}>Mood logs</Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About MindFlyer</Text>
          <Text style={styles.aboutText}>
            MindFlyer is an AI-powered mental wellness companion that helps you turn mental chaos into clarity.
            {'\n\n'}
            Built for the Claude Hackathon at Indiana University — March 2026.
            {'\n\n'}
            Powered by Claude AI, Deepgram, and Firebase.
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={[styles.card, styles.disclaimerCard]}>
          <Text style={styles.disclaimerTitle}>⚠  Not a substitute for therapy</Text>
          <Text style={styles.disclaimerText}>
            MindFlyer is a mental wellness tool, not a clinical service. If you are in crisis, please call 988 (Suicide & Crisis Lifeline) or 911.
          </Text>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>MindFlyer v1.0.0</Text>
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
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadow.sm,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentLt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.accent },
  displayName: { fontSize: 18, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.text3, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNum: { fontSize: 24, fontWeight: '700', color: colors.accent },
  statLabel: { fontSize: 11, color: colors.text3, marginTop: 2, textAlign: 'center' },
  flex: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10, alignSelf: 'flex-start' },
  aboutText: { fontSize: 14, color: colors.text2, lineHeight: 20, alignSelf: 'flex-start' },
  disclaimerCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  disclaimerTitle: { fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 8, alignSelf: 'flex-start' },
  disclaimerText: { fontSize: 13, color: '#78350f', lineHeight: 18, alignSelf: 'flex-start' },
  logoutBtn: {
    backgroundColor: '#fef2f2',
    borderRadius: radius.md,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 16,
  },
  logoutText: { fontSize: 15, color: colors.red, fontWeight: '600' },
  version: { fontSize: 12, color: colors.text3, textAlign: 'center' },
});
