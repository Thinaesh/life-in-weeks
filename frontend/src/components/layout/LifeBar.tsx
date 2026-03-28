import { useAppStore } from '../../store/useAppStore';
import { weeksBetween } from '../../utils/dateUtils';

export default function LifeBar() {
  const { profile } = useAppStore();

  if (!profile) return null;

  const birth = new Date(profile.birth_date);
  const now = new Date();
  const totalWeeks = profile.lifespan * 52;
  const lived = weeksBetween(birth, now);
  const remaining = Math.max(0, totalWeeks - lived);
  const pct = Math.min(100, (lived / totalWeeks) * 100);

  return (
    <div className="life-bar-container">
      <div className="life-bar-labels">
        <span className="lived"><span id="weeks-lived">{lived.toLocaleString()}</span> weeks lived</span>
        <span className="percent" id="life-percent">{pct.toFixed(1)}%</span>
        <span className="remaining"><span id="weeks-remaining">{remaining.toLocaleString()}</span> weeks left</span>
      </div>
      <div className="life-bar">
        <div className="life-bar-fill" id="life-bar-fill" style={{ width: `${pct}%` }}></div>
        <div className="life-bar-current" id="life-bar-current" style={{ left: `${pct}%` }}></div>
      </div>
    </div>
  );
}
