import { useAppStore } from '../store/useAppStore';

export default function MilestonesView() {
  const { milestones } = useAppStore();

  return (
    <>
      <div className="section-header">
        <div>
          <h2>Life Milestones</h2>
          <p className="text-muted">Significant events mapped exactly to the week they occurred.</p>
        </div>
        <button className="btn" id="add-milestone-btn">+ Add Milestone</button>
      </div>

      {!milestones.length ? (
        <div className="empty-state">
          <p>No milestones marked yet. Document the major events of your life.</p>
        </div>
      ) : (
        <div className="milestone-list">
          {milestones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
            <div key={m.id} className="milestone-item">
              <div className="milestone-icon">{m.icon || '♦'}</div>
              <div>
                <div className="milestone-title">{m.title}</div>
                <div className="milestone-meta">{m.date}</div>
                {m.description && <div className="milestone-desc">{m.description}</div>}
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
