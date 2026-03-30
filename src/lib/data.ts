import type { ReportData } from './types';

// Most mock data is removed as it will come from Firebase.
// Report data can remain for now as it's for charting and might need more complex aggregation logic.

export const weeklyReport: ReportData[] = [
    { name: 'Week 1', income: 6200, expenses: 355 },
    { name: 'Week 2', income: 400, expenses: 500 },
    { name: 'Week 3', income: 1500, expenses: 800 },
    { name: 'Week 4', income: 2000, expenses: 1200 },
];

export const monthlyReport: ReportData[] = [
    { name: 'Jan', income: 5000, expenses: 3000 },
    { name: 'Feb', income: 5200, expenses: 3500 },
    { name: 'Mar', income: 6000, expenses: 3200 },
    { name: 'Apr', income: 5500, expenses: 4000 },
    { name: 'May', income: 7000, expenses: 4500 },
    { name: 'Jun', income: 6500, expenses: 3800 },
];

export const annualReport: ReportData[] = [
    { name: '2021', income: 70000, expenses: 45000 },
    { name: '2022', income: 75000, expenses: 50000 },
    { name: '2023', income: 82000, expenses: 55000 },
];
