import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getWeekDateRange } from '../../utils/dateUtils';
import { api } from '../../api';

export default function JournalDrawer() {
  const { profile, selectedWeek, sidebarOpen, setSidebarOpen, journal, fetchInitialData } = useAppStore();
  
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (selectedWeek) {
      const entry = journal.find(j => j.year === selectedWeek.year && j.week === selectedWeek.week);
      setNote(entry?.note || '');
      setRating(entry?.rating || 0);
    }
  }, [selectedWeek, journal]);

  if (!profile || !selectedWeek) return null;

  const range = getWeekDateRange(profile.birth_date, selectedWeek.year, selectedWeek.week);

  const handleSave = async () => {
    try {
      await api.post('/api/journal', {
        year: selectedWeek.year,
        week: selectedWeek.week,
        note: note || null,
        rating: rating || null
      });
      // Re-fetch to seamlessly update the grid cache
      await fetchInitialData();
      setSidebarOpen(false);
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    }
  };

  return (
    <div className={`journal-panel ${sidebarOpen ? 'open' : ''}`} id="journal-panel">
      <div className="journal-header">
        <div style={{ flex: 1 }}>
          <h3 id="journal-title">Year {selectedWeek.year}, Week {selectedWeek.week + 1}</h3>
          <p className="journal-date" id="journal-date-range">{range.start} – {range.end}</p>
        </div>
        <button className="btn btn-sm btn-icon" onClick={() => setSidebarOpen(false)}>×</button>
      </div>

      <div className="journal-content">
        <label>How was this week?</label>
        <div className="rating-stars" id="rating-stars">
          {[1,2,3,4,5].map(star => (
            <span 
              key={star} 
              className={`star ${star <= rating ? 'active' : ''}`}
              onClick={() => setRating(star)}
            >★</span>
          ))}
        </div>

        <label style={{ marginTop: '20px' }}>Notes & Memories</label>
        <textarea 
          id="journal-note" 
          placeholder="What happened this week? (Markdown supported later)" 
          value={note}
          onChange={e => setNote(e.target.value)}
        />

        <div style={{ marginTop: '20px' }}>
          <label>Attach Photo (Snapshot)</label>
          <input type="file" id="snapshot-input" accept="image/*" style={{ fontSize: '0.85rem' }} />
          <img id="snapshot-preview" className="snapshot-preview hidden" />
        </div>
      </div>

      <div className="journal-footer">
        <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%', justifyContent: 'center' }}>
          Save Week
        </button>
      </div>
    </div>
  );
}
