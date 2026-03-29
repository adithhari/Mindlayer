export default function Navigation({ activeScreen, onScreenChange }) {
  const tabs = [
    { screen: 'home',     label: 'Home',     icon: '⬡' },
    { screen: 'insights', label: 'Insights', icon: '◈' },
    { screen: 'journal',  label: 'Journal',  icon: '▭' },
    { screen: 'findhelp', label: 'Find help',  icon: '♥' }
  ];

  return (
    <nav className="navigation" style={navStyles.container}>
      {tabs.map(({ screen, label, icon }) => (
        <button
          key={screen}
          className={`nav-item ${activeScreen === screen ? 'active' : ''}`}
          onClick={() => onScreenChange(screen)}
          style={activeScreen === screen ? navStyles.activeButton : navStyles.button}
        >
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}

const navStyles = {
  container: {
    position: 'fixed',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 40px)',
    maxWidth: '600px',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: '0 24px',
    background: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '24px',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)',
    zIndex: 100,
  },
  button: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: '500',
  },
  activeButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '8px 16px',
    background: 'rgba(99, 102, 241, 0.25)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    color: '#6366f1',
    fontSize: '12px',
    fontWeight: '600',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.2)',
  },
};
