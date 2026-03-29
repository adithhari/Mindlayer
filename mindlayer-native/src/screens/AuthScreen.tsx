import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors, radius, shadow } from '../utils/theme';

export default function AuthScreen() {
  const { register, login, error } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async () => {
    setLocalError('');
    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error || '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>MindFlyer</Text>
          <Text style={styles.tagline}>Turn mental chaos into clarity</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{isLogin ? 'Welcome back' : 'Create account'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.text3}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.text3}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />

          {displayError ? (
            <Text style={styles.error}>{displayError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{isLogin ? 'Sign in' : 'Create account'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setLocalError(''); }}>
            <Text style={styles.toggle}>
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 32, fontWeight: '700', color: colors.accent, letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: colors.text2, marginTop: 6 },
  card: {
    backgroundColor: colors.bg1,
    borderRadius: radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 20 },
  input: {
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  error: { color: colors.red, fontSize: 13, marginBottom: 12 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggle: {
    color: colors.accent,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});
