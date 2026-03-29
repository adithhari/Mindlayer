import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, radius, shadow } from '../utils/theme';

export default function OnboardingScreen() {
  const { setUserProfile } = useApp();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');

  const handleContinue = () => {
    if (!name.trim()) return;
    setUserProfile({ name: name.trim(), goal: goal.trim() });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>🧠</Text>
        <Text style={styles.title}>Welcome to MindFlyer</Text>
        <Text style={styles.subtitle}>Let's personalize your experience</Text>

        <View style={styles.card}>
          <Text style={styles.label}>What's your name?</Text>
          <TextInput
            style={styles.input}
            placeholder="Your first name"
            placeholderTextColor={colors.text3}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>What brings you here? (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Managing stress, processing emotions, clarity..."
            placeholderTextColor={colors.text3}
            value={goal}
            onChangeText={setGoal}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.btn, !name.trim() && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={!name.trim()}
          >
            <Text style={styles.btnText}>Get started →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.text2, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  card: {
    backgroundColor: colors.bg1,
    borderRadius: radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  label: { fontSize: 14, fontWeight: '600', color: colors.text2, marginBottom: 8 },
  input: {
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    marginBottom: 20,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
