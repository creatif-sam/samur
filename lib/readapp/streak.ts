export function calculateReadingStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const dateSet = new Set(dates);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;

  for (;;) {
    const check = new Date(today);
    check.setDate(today.getDate() - streak);
    const key = check.toISOString().split('T')[0];

    if (dateSet.has(key)) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}
