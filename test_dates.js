const { format, parseISO, subDays, isWithinInterval, startOfWeek } = require('date-fns');
const now = new Date('2026-03-03T08:57:00Z');
const interval = { start: subDays(now, 90), end: now };
console.log("Interval:", interval.start.toISOString(), "to", interval.end.toISOString());

const d = parseISO("2025-12-15T10:00:00Z");
console.log("Is within?", isWithinInterval(d, interval));
