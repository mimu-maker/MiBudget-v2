const { format, parseISO, subDays, isWithinInterval, startOfWeek, eachWeekOfInterval, startOfMonth, eachMonthOfInterval } = require('date-fns');
const da = require('date-fns/locale/da');

const now = new Date('2026-03-03T08:00:00.000Z');
const interval = { start: subDays(now, 90), end: now };

// simulate flowFiltered
const flowFiltered = [
  { date: '2025-12-15', amount: -100 },
  { date: '2025-12-31', amount: -50 },
  { date: '2026-01-02', amount: -20 },
  { date: '2026-01-05', amount: 30 }
].filter(t => {
    const d = parseISO(t.date);
    return isWithinInterval(d, interval);
});

console.log("flowFiltered length:", flowFiltered.length);

const periods = eachWeekOfInterval(interval, { weekStartsOn: 1 });
const monthlyData = periods.map(periodDate => {
    const periodStart = startOfWeek(periodDate, { weekStartsOn: 1 });
    const nextPeriodStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + 7);
    
    const monthTransactions = flowFiltered.filter(t => {
        const d = parseISO(t.date);
        return d >= periodStart && d < nextPeriodStart;
    });
    
    return {
        week: format(periodDate, 'I/RR'),
        start: periodStart.toISOString(),
        txCount: monthTransactions.length
    }
});

console.log(monthlyData);
