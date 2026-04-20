import { collection, query, where, getDocs, writeBatch, doc } from '@/appwrite';
import type { Firestore } from '@/appwrite';
import { RecurringTransaction, Expense, Income } from './types';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

export async function processRecurringTransactions(db: Firestore, userId: string, profileId: string) {
  if (!userId || !profileId) return;

  const now = new Date();
  const recurringRef = collection(db, 'users', userId, 'userProfiles', profileId, 'recurringTransactions');
  const expensesRef = collection(db, 'users', userId, 'userProfiles', profileId, 'expenses');
  const incomesRef = collection(db, 'users', userId, 'userProfiles', profileId, 'incomes');

  // We find active transactions where the next due date is now or in the past
  const q = query(
    recurringRef,
    where('isActive', '==', true),
    where('nextDueDate', '<=', now.toISOString())
  );

  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return;

    const batch = writeBatch(db);

    querySnapshot.forEach((document: any) => {
      const rt = document.data() as RecurringTransaction;
      
      // Compute the next due date based on frequency
      let nextDate = new Date(rt.nextDueDate);
      // If it's way behind, we bring it up to next future date 
      // (This prevents spawning hundreds of docs if the user hasn't logged in for a year)
      // To keep it simple, we just execute it once and set the next date forward from NOW.
      // Alternatively, we advance it by frequency strictly. We will advance it strictly once.
      switch (rt.frequency) {
        case 'daily':
          nextDate = addDays(nextDate, 1);
          break;
        case 'weekly':
          nextDate = addWeeks(nextDate, 1);
          break;
        case 'monthly':
          nextDate = addMonths(nextDate, 1);
          break;
        case 'yearly':
          nextDate = addYears(nextDate, 1);
          break;
      }
      
      // Generate the Expense or Income record
      if (rt.type === 'expense') {
        const newExpenseRef = doc(expensesRef);
        const newExpense: Expense = {
          profileId,
          amount: rt.amount,
          date: new Date().toISOString().split('T')[0], // yyyy-MM-dd
          category: rt.category,
          itemService: rt.description,
          frequency: 'once', // The instance is just an occurrence
          description: `Auto-generated from recurring transaction: ${rt.description}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        batch.set(newExpenseRef, newExpense);
      } else {
        const newIncomeRef = doc(incomesRef);
        const newIncome: Income = {
          profileId,
          amount: rt.amount,
          date: new Date().toISOString().split('T')[0],
          source: 'Recurring',
          description: `Auto-generated from recurring transaction: ${rt.description}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        batch.set(newIncomeRef, newIncome);
      }

      // Update the recurring transaction with new dates
      const rtDocRef = doc(recurringRef, document.id);
      batch.update(rtDocRef, {
        lastExecutedDate: now.toISOString(),
        nextDueDate: nextDate.toISOString()
      });
    });

    await batch.commit();
    console.log(`Processed ${querySnapshot.size} recurring transactions for profile ${profileId}`);

  } catch (error) {
    console.error("Error processing recurring transactions:", error);
  }
}
