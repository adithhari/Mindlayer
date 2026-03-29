import OrbScene from './OrbScene';

export default function OrbAssistant({ state = 'idle', sliderValue = 50, speakingHue = null, amplitudeRef }) {
  return (
    <div className="orb-container">
      <OrbScene
        state={state}
        sliderValue={sliderValue}
        speakingHue={speakingHue}
        amplitudeRef={amplitudeRef}
      />
    </div>
  );
}
