import { memo } from 'react';

interface WeekCellProps {
  year: number;
  week: number;
  isPast: boolean;
  isCurrent: boolean;
  chapterColor: string | null;
  journal?: { note?: string; rating?: number };
  hasMilestone: boolean;
  hasGoal: boolean;
  hasSnapshot: boolean;
  heatmapMode: boolean;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

const WeekCell = memo(({
  isPast, isCurrent, chapterColor, journal, hasMilestone, hasGoal, hasSnapshot, heatmapMode,
  onMouseEnter, onMouseLeave, onClick
}: WeekCellProps) => {

  let className = 'week-cell';
  if (isPast) className += ' filled';
  if (isCurrent) className += ' current';
  if (heatmapMode && journal?.rating) className += ` rating-${journal.rating}`;
  if (journal?.note) className += ' has-note';
  if (hasMilestone) className += ' has-milestone';
  if (hasGoal) className += ' has-goal';
  if (hasSnapshot) className += ' has-snapshot';

  // Apply explicit inline styles purely if there is a color for the past
  const style = (isPast && chapterColor) ? { background: chapterColor } : undefined;

  return (
    <div 
      className={className} 
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  );
}, (prev, next) => {
  // Custom equality check to maximize performance for 4,000+ nodes
  return (
    prev.isPast === next.isPast &&
    prev.isCurrent === next.isCurrent &&
    prev.chapterColor === next.chapterColor &&
    prev.heatmapMode === next.heatmapMode &&
    prev.hasMilestone === next.hasMilestone &&
    prev.hasGoal === next.hasGoal &&
    prev.hasSnapshot === next.hasSnapshot &&
    prev.journal?.note === next.journal?.note &&
    prev.journal?.rating === next.journal?.rating
  );
});

export default WeekCell;
