import { useState, Component } from 'react';
import { useApp } from './context/AppContext';
import Navigation from './components/Navigation/Navigation';
import Home from './components/Home/Home';
import Journal from './components/Journal/Journal';
import Tracker from './components/Tracker/Tracker';
import Onboarding from './components/Onboarding/Onboarding';
import SplashScreen from './components/Splash/SplashScreen';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, background: '#0d1117', color: '#ef4444', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ marginBottom: 12 }}>Render Error</h2>
          <pre style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: '#f87171' }}>{this.state.error.message}</pre>
          <pre style={{ fontSize: 11, color: '#4a5070', marginTop: 12 }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const { activeScreen, setActiveScreen, userProfile } = useApp();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) return <SplashScreen onComplete={() => setSplashDone(true)} />;
  if (!userProfile) return <Onboarding />;

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':     return <Home />;
      case 'insights': return <Tracker />;
      case 'journal':  return <Journal />;
      default:         return <Home />;
    }
  };

  return (
    <div className="mindlayer-app">
      <main className="screen-container">
        {renderScreen()}
      </main>
      <Navigation activeScreen={activeScreen} onScreenChange={setActiveScreen} />
    </div>
  );
}

export default function AppWithBoundary() {
  return <ErrorBoundary><App /></ErrorBoundary>;
}
