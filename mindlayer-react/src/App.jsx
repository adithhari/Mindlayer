import { useApp } from './context/AppContext';
import Navigation from './components/Navigation/Navigation';
import Home from './components/Home/Home';
import Journal from './components/Journal/Journal';
import Tracker from './components/Tracker/Tracker';
import Onboarding from './components/Onboarding/Onboarding';

function App() {
  const { activeScreen, setActiveScreen, userProfile } = useApp();

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

export default App;
