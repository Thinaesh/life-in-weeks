import { useAppStore } from '../store/useAppStore';

export default function ChaptersView() {
  const { chapters } = useAppStore();

  return (
    <>
      <div className="section-header">
        <div>
          <h2>Life Chapters</h2>
          <p className="text-muted">Define the major eras of your life (e.g., High School, College, First Job).</p>
        </div>
        <button className="btn" id="add-chapter-btn">+ Add Chapter</button>
      </div>

      {!chapters.length ? (
        <div className="empty-state">
          <p>No chapters yet. Start defining the eras of your life.</p>
        </div>
      ) : (
        <div className="chapter-list">
          {chapters.sort((a, b) => a.sort_order - b.sort_order).map((ch) => (
            <div key={ch.id} className="chapter-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="chapter-color-dot" style={{ background: ch.color }}></div>
                <div>
                  <div className="chapter-name">{ch.name}</div>
                  <div className="chapter-dates">{ch.start_date} → {ch.end_date || 'Present'}</div>
                </div>
              </div>
              <div className="chapter-actions">
                <button className="btn btn-sm btn-icon">✎</button>
                <button className="btn btn-sm btn-icon">❌</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
