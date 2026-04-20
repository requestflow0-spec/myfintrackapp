import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/appwrite';
import { useProfile } from '@/context/ProfileContext';
import { collection } from '@/appwrite';
import type { Debt, RecurringTransaction, Reminder } from '@/lib/types';
import { differenceInDays, parseISO, isAfter } from 'date-fns';

export function useReminders(daysThreshold: number = 7) {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();

  const debtsQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/debts`);
  }, [user, currentProfile, firestore]);

  const recurringQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/recurringTransactions`);
  }, [user, currentProfile, firestore]);

  const { data: debts, isLoading: isDebtsLoading } = useCollection<Debt>(debtsQuery);
  const { data: recurringTx, isLoading: isRecurringLoading } = useCollection<RecurringTransaction>(recurringQuery);

  const reminders = useMemo(() => {
    if (!currentProfile) return [];

    const now = new Date();
    const newReminders: Reminder[] = [];

    // Process Debts
    if (debts) {
      debts.forEach(debt => {
        if (!debt.dueDate) return;

        const due = parseISO(debt.dueDate);
        const diff = differenceInDays(due, now);

        if (diff >= 0 && diff <= daysThreshold && debt.currentBalance > 0) {
          newReminders.push({
            id: `debt-${(debt as any).id}`,
            profileId: currentProfile.id,
            title: `Debt Payment: ${debt.name}`,
            dueDate: debt.dueDate,
            amount: debt.minimumPayment || undefined,
            type: 'debt_payment',
            linkedId: (debt as any).id,
            isDismissed: false,
            isRecurring: false
          });
        }
      });
    }

    // Process Recurring Transactions
    if (recurringTx) {
      recurringTx.forEach(rt => {
        if (!rt.isActive) return;

        const next = new Date(rt.nextDueDate);
        const diff = differenceInDays(next, now);

        if (diff >= 0 && diff <= daysThreshold) {
          newReminders.push({
            id: `recurring-${(rt as any).id}`,
            profileId: currentProfile.id,
            title: `Upcoming ${rt.type === 'expense' ? 'Bill' : 'Income'}: ${rt.description}`,
            dueDate: rt.nextDueDate,
            amount: rt.amount,
            type: rt.type === 'expense' ? 'bill' : 'recurring',
            linkedId: (rt as any).id,
            isDismissed: false,
            isRecurring: true
          });
        }
      });
    }

    // Sort by due date (closest first)
    return newReminders.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  }, [debts, recurringTx, currentProfile, daysThreshold]);

  return {
    reminders,
    isLoading: isDebtsLoading || isRecurringLoading
  };
}
