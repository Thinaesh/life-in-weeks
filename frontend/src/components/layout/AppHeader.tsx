import { useAppStore } from '../../store/useAppStore';

export default function AppHeader() {
  const { profile, currentView, setCurrentView } = useAppStore();

  const navItems = [
    { id: 'grid', label: 'Grid', icon: '▦' },
    { id: 'stats', label: 'Stats', icon: '◉' },
    { id: 'chapters', label: 'Chapters', icon: '◧' },
    { id: 'milestones', label: 'Milestones', icon: '♦' },
    { id: 'goals', label: 'Goals', icon: '⊕' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ];

  const handleNav = (id: string) => {
    setCurrentView(id);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="logo">Life<span className="accent">.</span>Weeks</h1>
      </div>
      <nav className="header-nav">
        {navItems.map(item => (
          <button 
            key={item.id}
            className={`nav-btn ${(currentView === item.id || (item.id === 'grid' && currentView === 'weeks')) ? 'active' : ''}`}
            onClick={() => handleNav(item.id)}
          >
            <span className="nav-icon">{item.icon}</span> {item.label}
          </button>
        ))}
      </nav>
      <div className="header-right">
        <div className="view-toggle" style={{ visibility: currentView === 'grid' || currentView === 'weeks' ? 'visible' : 'hidden' }}>
          <button className={`view-btn ${currentView === 'weeks' || currentView === 'grid' ? 'active' : ''}`} onClick={() => setCurrentView('weeks')}>WEEKS</button>
          <button className={`view-btn ${currentView === 'months' ? 'active' : ''}`} onClick={() => setCurrentView('months')}>MONTHS</button>
          <button className={`view-btn ${currentView === 'years' ? 'active' : ''}`} onClick={() => setCurrentView('years')}>YEARS</button>
          <button className={`view-btn ${currentView === 'eras' ? 'active' : ''}`} onClick={() => setCurrentView('eras')}>ERAS</button>
        </div>
        <div className="user-name">{profile?.name || ''}</div>
      </div>
    </header>
  );
}
