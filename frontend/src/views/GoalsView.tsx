import { useAppStore } from '../store/useAppStore';

export default function GoalsView() {
  const { goals } = useAppStore();

  return (
    <>
      <div className="section-header">
        <div>
          <h2>Life Goals</h2>
          <p className="text-muted">Aspirations with deadlines map to specific weeks on your grid.</p>
        </div>
        <button className="btn" id="add-goal-btn">+ Add Goal</button>
      </div>

      {!goals.length ? (
        <div className="empty-state">
          <p>No goals set yet. What do you want to accomplish?</p>
        </div>
      ) : (
        <div className="goal-list">
          {goals.sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime()).map(g => (
            <div key={g.id} className={`goal-item ${g.completed ? 'completed' : ''}`}>
              <div>
                <div className="goal-title">{g.title}</div>
                <div className="goal-meta">Target: {g.target_date}</div>
                {g.description && <div className="goal-desc">{g.description}</div>}
              </div>
              <div className="chapter-actions">
                <button className="btn btn-sm" style={{ marginRight: '8px' }}>
                  {g.completed ? 'Undo' : 'Complete'}
                </button>
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
