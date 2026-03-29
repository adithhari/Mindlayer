import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FirebaseAuthProvider } from './src/context/FirebaseAuthContext';
import { AppProvider } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FirebaseAuthProvider>
          <AppProvider>
            <RootNavigator />
          </AppProvider>
        </FirebaseAuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
