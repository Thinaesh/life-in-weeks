import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';

const PALETTES = [
  { id: 'coral', color: '#ff7b72' },
  { id: 'ocean', color: '#79c0ff' },
  { id: 'forest', color: '#7ee787' },
  { id: 'lavender', color: '#d2a8ff' },
  { id: 'sun', color: '#ffd54f' },
  { id: 'frosted', color: '#82a8fe' }
];

export default function SettingsView() {
  const { profile, settings, updateSettings } = useAppStore();
  const { logout } = useAuthStore();

  const handlePaletteClick = async (paletteId: string) => {
    if (settings.theme === paletteId) return;
    await updateSettings({ theme: paletteId });
  };

  const handleModeToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMode = e.target.checked ? 'dark' : 'light';
    if (settings.mode === newMode) return;
    await updateSettings({ mode: newMode });
  };

  const handleReminderToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newReminder = e.target.checked ? 'true' : 'false';
    if (settings.reminder_enabled === newReminder) return;
    await updateSettings({ reminder_enabled: newReminder });
  };

  return (
    <div className="settings-panel">
      <div className="settings-hero">
        <div className="profile-edit-avatar">{profile?.name.charAt(0).toUpperCase()}</div>
        <h3>{profile?.name}</h3>
        <p className="text-muted">Born {profile?.birth_date}</p>
        <button className="btn btn-sm" style={{ marginTop: '16px' }}>Edit Profile</button>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Appearance</div>
        
        <div className="setting-row">
          <div>
            <div className="setting-label">Color Palette</div>
            <div className="setting-sublabel">Your primary accent color</div>
          </div>
          <div className="palette-selector">
            {PALETTES.map(p => (
              <div 
                key={p.id}
                className={`palette-swatch ${settings.theme === p.id ? 'active' : ''}`}
                style={{ backgroundColor: p.color }}
                onClick={() => handlePaletteClick(p.id)}
              />
            ))}
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Dark Mode</div>
            <div className="setting-sublabel">Switch to lighter themes</div>
          </div>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={settings.mode === 'dark'} 
              onChange={handleModeToggle} 
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Notifications</div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Weekly Reminder</div>
            <div className="setting-sublabel">Sunday evening review prompt</div>
          </div>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={settings.reminder_enabled === 'true'} 
              onChange={handleReminderToggle} 
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Account</div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Change Password</div>
            <div className="setting-sublabel">Update your account password</div>
          </div>
          <button className="btn btn-sm">🔐 Change</button>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Sign Out</div>
            <div className="setting-sublabel">Log out of your account</div>
          </div>
          <button className="btn btn-sm btn-danger" onClick={() => logout()}>🚪 Sign Out</button>
        </div>
      </div>
    </div>
  );
}
