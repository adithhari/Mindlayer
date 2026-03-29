# MindFlyer Mobile App — Implementation Plan

## Overview

A standalone React Native + Expo mobile app at `/Users/chiragdodia/Desktop/MindLayer/mindlayer-native/` that replicates all features of the web app for iOS + Android.

**Key constraints:**
- White/light theme (matching web)
- Full 3D orb animation (not simplified)
- Standalone folder — NOT inside `mindlayer-react/`
- NOT pushed to git

---

## Tech Stack

| Concern | Web | Mobile |
|---|---|---|
| Framework | Vite + React 18 | Expo SDK 51 (managed → prebuild for Vapi) |
| Language | JSX | TypeScript + TSX |
| Navigation | Manual state switch | @react-navigation/native + bottom-tabs |
| Styling | CSS vars | StyleSheet.create() + src/utils/theme.ts tokens |
| Persistence | localStorage | @react-native-async-storage/async-storage |
| Firebase | firebase JS SDK | Same SDK + initializeAuth with getReactNativePersistence |
| Audio record | MediaRecorder | expo-av Audio.Recording |
| Vapi voice | @vapi-ai/web | @vapi-ai/react-native (+ react-native-webrtc, requires prebuild) |
| Orb animation | Canvas 2D | react-native-reanimated + react-native-svg |
| Audio playback | createObjectURL | expo-av Audio.Sound |
| Icons | Emoji | @expo/vector-icons (Ionicons) |

---

## Project Location

`/Users/chiragdodia/Desktop/MindLayer/mindlayer-native/`

---

## Environment Variables

`.env` file (rename all `VITE_` → `EXPO_PUBLIC_`):
```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_ANTHROPIC_API_KEY
EXPO_PUBLIC_DEEPGRAM_API_KEY
EXPO_PUBLIC_VAPI_PUBLIC_KEY
EXPO_PUBLIC_HUME_API_KEY
```

---

## Project Structure

```
mindlayer-native/
├── app.json
├── babel.config.js          ← must include Reanimated plugin
├── tsconfig.json
├── .env
├── assets/
└── src/
    ├── navigation/
    │   ├── RootNavigator.tsx    ← auth gate + hydration guard
    │   └── TabNavigator.tsx     ← 4-tab bottom bar
    ├── screens/
    │   ├── SplashScreen.tsx
    │   ├── AuthScreen.tsx
    │   ├── OnboardingScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── InsightsScreen.tsx
    │   ├── JournalScreen.tsx
    │   └── SettingsScreen.tsx
    ├── components/
    │   ├── orb/OrbAnimated.tsx
    │   ├── home/MoodSlider.tsx
    │   ├── home/SaveJournalModal.tsx
    │   ├── journal/JournalCard.tsx
    │   ├── journal/JournalModal.tsx
    │   ├── journal/TranscriptCard.tsx
    │   ├── journal/TranscriptModal.tsx
    │   └── crisis/CrisisOverlay.tsx
    ├── context/
    │   ├── AppContext.tsx        ← async hydration from AsyncStorage
    │   └── FirebaseAuthContext.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useAudioRecorder.ts  ← expo-av rewrite
    │   ├── useVapi.ts           ← @vapi-ai/react-native rewrite
    │   └── useFirebaseStorage.ts
    ├── lib/
    │   └── firebase.ts          ← initializeAuth with RN persistence
    └── utils/
        ├── api.ts               ← port verbatim; modify audio helpers
        ├── constants.ts         ← port verbatim
        └── theme.ts             ← CSS vars → JS tokens
```

---

## Theme — White/Light (default)

```typescript
// src/utils/theme.ts
export const colors = {
  bg1: '#FFFFFF',
  bg2: '#F8FAFC',
  bg3: '#F1F5F9',
  border: '#E2E8F0',
  border2: '#CBD5E1',
  text: '#0F172A',
  text2: '#475569',
  text3: '#94A3B8',
  accent: '#6366F1',
  accentLt: 'rgba(99,102,241,0.08)',
  red: '#EF4444',
  green: '#10B981',
  yellow: '#F59E0B',
};

export const radius = { sm: 8, md: 12, lg: 18 };
export const shadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
};
```

---

## Critical Implementation Notes

### 1. Firebase Auth (React Native)
```typescript
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
// DO NOT use getAuth(app) — sessions won't survive app restart
```

### 2. AppContext — Async Hydration
```typescript
const [hydrated, setHydrated] = useState(false);
useEffect(() => {
  const hydrate = async () => {
    const stored = await AsyncStorage.getItem('ml_moodlog');
    if (stored) setMoodLog(JSON.parse(stored));
    // repeat for all persisted keys
    setHydrated(true);
  };
  hydrate();
}, []);
```

### 3. Audio Recording (expo-av)
```typescript
const startRecording = async () => {
  await Audio.requestPermissionsAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  recordingRef.current = recording;
};
const stopRecording = async (): Promise<string> => {
  await recordingRef.current.stopAndUnloadAsync();
  return recordingRef.current.getURI(); // file:// URI
};
```
Modify `deepgramSpeechToText` to accept URI:
```typescript
const formData = new FormData();
formData.append('audio', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);
```

### 4. Full 3D Orb (react-native-reanimated + react-native-svg)
- Port `getMoodHSL`, `lerpHue`, `heartbeatPulse`, `makeRng`, `BASE_PTS`, `CONNS` into `orbUtils.ts`
- `useFrameCallback` on UI thread drives `t` shared value (replaces rAF)
- `useDerivedValue` + `useAnimatedProps` worklet projects all points — runs on UI thread (JSI)
- Reduce N_PTS: 200 → 80, CONN_THRESH: 0.45 → 0.55 for mobile performance
- State changes written to shared values — no React re-renders

### 5. Crisis Overlay — Phone Linking
```typescript
import { Linking } from 'react-native';
<TouchableOpacity onPress={() => Linking.openURL('tel:988')}>
```

---

## Navigation Flow

```
RootNavigator
├── if (!hydrated || authLoading) → <ActivityIndicator />
├── if (!user) → AuthScreen
├── if (!userProfile) → OnboardingScreen
└── else → TabNavigator
    ├── Home (HomeScreen)
    ├── Insights (InsightsScreen)
    ├── Journal (JournalScreen)
    └── Settings (SettingsScreen)
```

---

## Installation Commands

```bash
npx create-expo-app mindlayer-native --template expo-template-blank-typescript
cd mindlayer-native

npx expo install \
  @react-navigation/native \
  @react-navigation/bottom-tabs \
  react-native-screens \
  react-native-safe-area-context \
  react-native-gesture-handler \
  @react-native-async-storage/async-storage \
  firebase \
  expo-av \
  expo-file-system \
  @expo/vector-icons \
  react-native-reanimated \
  react-native-svg
```

---

## Implementation Phases

| Phase | Tasks | Output |
|---|---|---|
| 1 | Scaffold, deps, theme, firebase, AppContext, navigation skeleton | App boots, tabs visible |
| 2 | AuthScreen, OnboardingScreen | Full auth flow works |
| 3 | Full 3D OrbAnimated, MoodSlider, HomeScreen (text path) | Type thought → AI response + live orb |
| 4 | useAudioRecorder, record button, Deepgram STT | Voice → AI response |
| 5 | InsightsScreen, JournalScreen + cards + modals | All screens functional |
| 6 | expo prebuild, Vapi RN, conversation button | Live voice conversations |
| 7 | SplashScreen, final polish | Full parity with web |
