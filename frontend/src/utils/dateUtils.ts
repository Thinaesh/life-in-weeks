export function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getWeekDateRange(birthDate: string | Date, yearIndex: number, weekIndex: number) {
  const birth = new Date(birthDate);
  const start = new Date(birth);
  start.setDate(start.getDate() + (yearIndex * 365.25) + (weekIndex * 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
      start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  };
}

export function weeksBetween(d1: Date, d2: Date) {
  return Math.floor((d2.getTime() - d1.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

export function dateToYearWeek(birthDate: string | Date, targetDate: string | Date) {
  const birth = new Date(birthDate);
  const target = new Date(targetDate);
  const totalWeeks = weeksBetween(birth, target);
  return { year: Math.floor(totalWeeks / 52), week: totalWeeks % 52 };
}

export function yearWeekToDate(birthDate: string | Date, year: number, week: number) {
  const birth = new Date(birthDate);
  const d = new Date(birth);
  d.setDate(d.getDate() + year * 364 + week * 7);
  return d;
}
