export default function Navigation({ activeScreen, onScreenChange }) {
  const tabs = [
    { screen: 'home',     label: 'Home',      icon: '⬡' },
    { screen: 'insights', label: 'Insights',   icon: '📊' },
    { screen: 'journal',  label: 'Journal',    icon: '📓' },
    { screen: 'findhelp', label: 'Find help',  icon: '🤝' },
  ];

  return (
    <nav className="navigation">
      {tabs.map(({ screen, label, icon }) => (
        <button
          key={screen}
          className={`nav-item ${activeScreen === screen ? 'active' : ''}`}
          onClick={() => onScreenChange(screen)}
        >
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
