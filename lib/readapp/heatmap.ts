export interface HeatmapDay {
  date: string;
  count: number;
}

export function buildHeatmap(
  days: HeatmapDay[],
  months = 3
): HeatmapDay[] {
  const map = new Map(days.map((d) => [d.date, d.count]));
  const result: HeatmapDay[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setMonth(start.getMonth() - months);

  for (
    let d = new Date(start);
    d <= today;
    d.setDate(d.getDate() + 1)
  ) {
    const key = d.toISOString().split('T')[0];
    result.push({
      date: key,
      count: map.get(key) ?? 0,
    });
  }

  return result;
}
