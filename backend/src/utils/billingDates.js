export function addPeriod(date, period) {
  const result = new Date(date);
  if (period === 'DAILY') result.setUTCDate(result.getUTCDate() + 1);
  if (period === 'WEEKLY') result.setUTCDate(result.getUTCDate() + 7);
  if (period === 'YEARLY') {
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCFullYear(result.getUTCFullYear() + 1);
    result.setUTCDate(Math.min(day, daysInUtcMonth(result.getUTCFullYear(), result.getUTCMonth())));
  }
  if (period === 'MONTHLY') {
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + 1);
    result.setUTCDate(Math.min(day, daysInUtcMonth(result.getUTCFullYear(), result.getUTCMonth())));
  }
  return result;
}

function daysInUtcMonth(year, month) { return new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); }
