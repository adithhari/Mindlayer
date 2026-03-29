import { useEffect, useState } from 'react';
import OrbScene from '../Orb/OrbScene';

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    const exitTimer = setTimeout(() => setPhase('exit'), 1800);
    const doneTimer = setTimeout(() => onComplete(), 2700);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onComplete]);

  return (
    <div className={`splash-screen splash--${phase}`}>
      <div className="splash-orb">
        <OrbScene state="idle" sliderValue={50} speakingHue={null} />
      </div>
      <div className="splash-text">
        <h1 className="splash-title">MindFlyer</h1>
        <p className="splash-sub">Your mental clarity companion</p>
      </div>
    </div>
  );
}
