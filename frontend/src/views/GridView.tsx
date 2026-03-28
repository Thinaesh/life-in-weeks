import { useState, useMemo, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getWeekDateRange, weeksBetween, dateToYearWeek, yearWeekToDate } from '../utils/dateUtils';
import WeekCell from '../components/grid/WeekCell';
import HeatmapLegend from '../components/grid/HeatmapLegend';

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  year: number;
  week: number;
}

export default function GridView() {
  const { 
    profile, currentView, heatmapMode, 
    chapters, journal, milestones, goals, snapshots,
    setSelectedWeek
  } = useAppStore();

  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, year: 0, week: 0 });
  const gridWrapperRef = useRef<HTMLDivElement>(null);

  const lifespan = profile?.lifespan || 80;
  const birth = profile ? new Date(profile.birth_date) : new Date();
  const now = new Date();

  // Optimizing lookups using React core useMemo
  const { journalMap, snapshotMap, milestoneMap, goalMap } = useMemo(() => {
    const jMap: Record<string, any> = {};
    const sMap: Record<string, any> = {};
    const mMap: Record<string, any> = {};
    const gMap: Record<string, any> = {};

    journal.forEach(j => { jMap[`${j.year}-${j.week}`] = j; });
    snapshots.forEach(s => { sMap[`${s.year}-${s.week}`] = s; });
    milestones.forEach(m => {
      if (profile) {
        const yw = dateToYearWeek(profile.birth_date, m.date);
        mMap[`${yw.year}-${yw.week}`] = m;
      }
    });
    goals.forEach(g => {
      if (profile) {
        const yw = dateToYearWeek(profile.birth_date, g.target_date);
        gMap[`${yw.year}-${yw.week}`] = g;
      }
    });

    return { journalMap: jMap, snapshotMap: sMap, milestoneMap: mMap, goalMap: gMap };
  }, [journal, snapshots, milestones, goals, profile]);

  const getChapterColor = (yearIdx: number, weekIdx: number) => {
    if (!profile) return null;
    const weekDate = yearWeekToDate(profile.birth_date, yearIdx, weekIdx);
    for (const ch of chapters) {
      const start = new Date(ch.start_date);
      const end = ch.end_date ? new Date(ch.end_date) : new Date();
      if (weekDate >= start && weekDate <= end) return ch.color;
    }
    return null;
  };

  const getChapterName = (yearIdx: number, weekIdx: number) => {
    if (!profile) return null;
    const weekDate = yearWeekToDate(profile.birth_date, yearIdx, weekIdx);
    for (const ch of chapters) {
      const start = new Date(ch.start_date);
      const end = ch.end_date ? new Date(ch.end_date) : new Date();
      if (weekDate >= start && weekDate <= end) return ch.name;
    }
    return null;
  };

  const handleMouseEnter = (e: React.MouseEvent, year: number, week: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    let left = rect.right + 8;
    let top = rect.top;

    // Simple boundary check
    if (left + 220 > window.innerWidth) left = rect.left - 220 - 8;
    
    setTooltip({ visible: true, x: left, y: top, year, week });
  };

  const handleMouseLeave = () => setTooltip(t => ({ ...t, visible: false }));

  // Render Weeks Block
  if (currentView === 'weeks' || currentView === 'grid') {
    const totalLivedWeeks = weeksBetween(birth, now);
    const currentYear = Math.floor(totalLivedWeeks / 52);
    const currentWeek = totalLivedWeeks % 52;

    const years = Array.from({ length: lifespan }, (_, y) => y);
    const weeksList = Array.from({ length: 52 }, (_, w) => w);

    return (
      <div className="grid-wrapper" ref={gridWrapperRef}>
        {heatmapMode && <HeatmapLegend />}
        <div style={{ display: 'flex' }}>
          <div className="grid-year-labels">
            {years.map(y => (
              <div key={y} className={`year-label ${y % 10 === 0 ? 'decade' : ''}`}>{y}</div>
            ))}
          </div>
          <div className="week-grid">
            {years.map(y => (
              <div key={y} className="week-row">
                {weeksList.map(w => {
                  const key = `${y}-${w}`;
                  const isPast = y < currentYear || (y === currentYear && w < currentWeek);
                  const isCurrent = y === currentYear && w === currentWeek;
                  const chapterColor = isPast ? getChapterColor(y, w) : null;
                  
                  return (
                    <WeekCell
                      key={key}
                      year={y}
                      week={w}
                      isPast={isPast}
                      isCurrent={isCurrent}
                      chapterColor={chapterColor}
                      journal={journalMap[key]}
                      hasMilestone={!!milestoneMap[key]}
                      hasGoal={!!goalMap[key]}
                      hasSnapshot={!!snapshotMap[key]}
                      heatmapMode={heatmapMode}
                      onMouseEnter={(e) => handleMouseEnter(e, y, w)}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => setSelectedWeek({ year: y, week: w })}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Global Floating Tooltip */}
        {tooltip.visible && profile && (
          <div 
            className="grid-tooltip visible" 
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <strong>Year {tooltip.year}, Week {tooltip.week + 1}</strong>
            <div className="tooltip-date">
              {getWeekDateRange(profile.birth_date, tooltip.year, tooltip.week).start} – {getWeekDateRange(profile.birth_date, tooltip.year, tooltip.week).end}
            </div>
            {getChapterName(tooltip.year, tooltip.week) && (
              <div className="tooltip-chapter">{getChapterName(tooltip.year, tooltip.week)}</div>
            )}
            {journalMap[`${tooltip.year}-${tooltip.week}`]?.rating && (
              <div>
                {'★'.repeat(journalMap[`${tooltip.year}-${tooltip.week}`].rating)}
                {'☆'.repeat(5 - journalMap[`${tooltip.year}-${tooltip.week}`].rating)}
              </div>
            )}
            {journalMap[`${tooltip.year}-${tooltip.week}`]?.note && (
              <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {journalMap[`${tooltip.year}-${tooltip.week}`].note.substring(0, 80)}
                {journalMap[`${tooltip.year}-${tooltip.week}`].note.length > 80 ? '…' : ''}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Placeholder for Months, Years, Eras to perfectly mirror JS architecture
  return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
      {currentView} view not yet fully mapped in React MVP — Please switch back to WEEKS.
    </div>
  );
}
