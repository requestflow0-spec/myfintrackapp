import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/appwrite';
import { useProfile } from '@/context/ProfileContext';
import { collection, query, where } from '@/appwrite';
import type { Budget, Expense } from '@/lib/types';
import {
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  isWithinInterval,
  parseISO
} from 'date-fns';

export interface BudgetProgress extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
}

export function useBudgetProgress() {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();

  // Queries
  const budgetsQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/budgets`);
  }, [user, currentProfile, firestore]);

  const expensesQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    // We grab all expenses and filter locally for simplicity given complex date rules.
    // In a massive dataset, we'd limit this or create specific period collections.
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/expenses`);
  }, [user, currentProfile, firestore]);

  // Data fetching
  const { data: budgets, isLoading: isBudgetsLoading } = useCollection<Budget>(budgetsQuery);
  const { data: expenses, isLoading: isExpensesLoading } = useCollection<Expense>(expensesQuery);

  const budgetProgress = useMemo(() => {
    if (!budgets || !expenses) return [];

    const now = new Date();

    return budgets.map(budget => {
      // Determine the date bounds based on period
      let start: Date;
      let end: Date;

      switch (budget.period) {
        case 'weekly':
          start = startOfWeek(now);
          end = endOfWeek(now);
          break;
        case 'monthly':
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        case 'yearly':
          start = startOfYear(now);
          end = endOfYear(now);
          break;
        default:
          start = startOfMonth(now);
          end = endOfMonth(now);
      }

      // Aggregate matching expenses within the interval
      const periodExpenses = expenses.filter(expense => {
        if (expense.category !== budget.category) return false;
        
        const expenseDate = parseISO(expense.date);
        return isWithinInterval(expenseDate, { start, end });
      });

      const spent = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const remaining = Math.max(0, budget.limitAmount - spent);
      const percentage = Math.min(100, Math.round((spent / budget.limitAmount) * 100));

      // Calculate status based on user's threshold
      let status: 'safe' | 'warning' | 'danger' = 'safe';
      const dangerThreshold = 100;
      const warningThreshold = budget.alertThreshold || 80;

      if (percentage >= dangerThreshold) {
        status = 'danger';
      } else if (percentage >= warningThreshold) {
        status = 'warning';
      }

      return {
        ...budget,
        spent,
        remaining,
        percentage,
        status
      } as BudgetProgress;
    });
  }, [budgets, expenses]);

  return {
    budgets: budgetProgress,
    isLoading: isBudgetsLoading || isExpensesLoading
  };
}
