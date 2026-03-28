import { useState } from 'react';
import { api } from '../../api';
import { useAppStore } from '../../store/useAppStore';

export default function OnboardingModal() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [lifespan, setLifespan] = useState(80);
  const { updateProfile } = useAppStore();

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.post('/api/profile', { name, birth_date: dob, lifespan });
      updateProfile(data);
    } catch (err: any) {
      alert(err.message || 'Failed to save profile');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal onboarding-modal">
        <div className="modal-glow"></div>
        <h1 className="modal-title">Welcome to <span className="accent">Life in Weeks</span></h1>
        <p className="modal-subtitle">Visualize your entire life. Every week counts.</p>
        
        <form onSubmit={handleOnboard} className="onboarding-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>Your Name</label>
            <input 
              type="text" 
              required 
              placeholder="Enter your name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input 
              type="date" 
              required 
              value={dob} 
              onChange={e => setDob(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Expected Lifespan (years)</label>
            <input 
              type="number" 
              min={1} 
              max={120} 
              value={lifespan} 
              onChange={e => setLifespan(Number(e.target.value))} 
            />
          </div>
          <button type="submit" className="btn btn-primary btn-glow" style={{ justifyContent: 'center', marginTop: '8px' }}>
            Begin Your Journey
          </button>
        </form>
      </div>
    </div>
  );
}
