import { useAppStore } from '../store/useAppStore';
import { weeksBetween } from '../utils/dateUtils';

export default function StatsView() {
  const { profile, journal, chapters } = useAppStore();

  if (!profile) return null;

  const birth = new Date(profile.birth_date);
  const now = new Date();
  const totalWeeks = profile.lifespan * 52;
  const lived = weeksBetween(birth, now);
  const remaining = Math.max(0, totalWeeks - lived);
  const pct = Math.min(100, (lived / totalWeeks) * 100);
  const ageYears = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  const ratedWeeks = journal.filter(j => j.rating);
  const avgRating = ratedWeeks.length ? (ratedWeeks.reduce((s, j) => s + (j.rating||0), 0) / ratedWeeks.length).toFixed(1) : '—';
  const journalEntries = journal.filter(j => j.note).length;
  
  const getCurrentChapter = () => {
    for (const ch of chapters) {
        const start = new Date(ch.start_date);
        const end = ch.end_date ? new Date(ch.end_date) : new Date();
        if (now >= start && now <= end) return ch.name;
    }
    return null;
  };
  const currentChapter = getCurrentChapter();

  const internetEra = new Date('1991-08-06');
  const smartphoneEra = new Date('2007-06-29');
  const aliveDuringInternet = now > internetEra ? Math.max(0, weeksBetween(birth > internetEra ? birth : internetEra, now)) : 0;
  const aliveDuringSmartphone = now > smartphoneEra ? Math.max(0, weeksBetween(birth > smartphoneEra ? birth : smartphoneEra, now)) : 0;

  return (
    <>
      <div className="section-header">
        <div>
          <h2>Your Life in Stats</h2>
          <p className="text-muted">A quantitative look at your timeline and journal.</p>
        </div>
      </div>

      <div className="stats-grid" id="stats-content">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Life Progress</span>
            <span className="stat-card-icon">⏳</span>
          </div>
          <div className="stat-card-value">{pct.toFixed(1)}%</div>
          <div className="stat-card-sub">{lived.toLocaleString()} of {totalWeeks.toLocaleString()} weeks</div>
          <div className="stat-bar"><div className="stat-bar-fill" style={{ width: `${pct}%` }}></div></div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Current Age</span>
            <span className="stat-card-icon">🎂</span>
          </div>
          <div className="stat-card-value">{ageYears}</div>
          <div className="stat-card-sub">years old · Week {(lived % 52) + 1} of year {Math.floor(lived / 52)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Weeks Remaining</span>
            <span className="stat-card-icon">💎</span>
          </div>
          <div className="stat-card-value">{remaining.toLocaleString()}</div>
          <div className="stat-card-sub">{(remaining / 52).toFixed(1)} years left to make count</div>
          <div className="diamond-viz">
            <div className="diamond-count">
              💎 {remaining.toLocaleString()}
              <small>diamonds remaining in your spoon</small>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Current Chapter</span>
            <span className="stat-card-icon">📖</span>
          </div>
          <div className="stat-card-value">{currentChapter || '—'}</div>
          <div className="stat-card-sub">{chapters.length} total chapters defined</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Journal Insights</span>
            <span className="stat-card-icon">📝</span>
          </div>
          <div className="stat-card-value">{journalEntries}</div>
          <div className="stat-card-sub">written entries</div>
          <div className="insight-metric">
            <span>Average Week Rating</span>
            <strong>{avgRating} <span className="text-accent">★</span></strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Era Milestones</span>
            <span className="stat-card-icon">📱</span>
          </div>
          <div className="stat-card-value">{aliveDuringInternet.toLocaleString()}</div>
          <div className="stat-card-sub">weeks lived with the internet</div>
          <div className="insight-metric">
            <span>Weeks w/ smartphones</span>
            <strong>{aliveDuringSmartphone.toLocaleString()}</strong>
          </div>
        </div>
        
      </div>
    </>
  );
}
