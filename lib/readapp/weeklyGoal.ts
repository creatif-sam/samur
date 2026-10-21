import { toLocalDateKey } from '@/lib/dates';

export function getWeekRange(date: Date): {
  start: string;
  end: string;
} {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);

  const start = new Date(d);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: toLocalDateKey(start),
    end: toLocalDateKey(end),
  };
}
