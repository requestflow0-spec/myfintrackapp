import { collection, getDocs, doc, writeBatch, Firestore } from '@/appwrite';

interface ConvertOptions {
  firestore: Firestore;
  userId: string;
  profileId: string;
  fromCurrency: string;
  toCurrency: string;
}

// Function to fetch the exchange rate
export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  
  if (from === to) return 1;

  try {
    // API provides base rates against USD by default, but we can fetch for 'fromCurrency' base.
    // open.er-api.com allows fetching rates for a specific base currency.
    const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    if (!response.ok) {
      console.error("Exchange rate API error");
      return null;
    }
    const data = await response.json();
    if (data && data.rates && data.rates[to]) {
      return data.rates[to];
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch exchange rate:", error);
    return null;
  }
}

export async function convertProfileData(options: ConvertOptions): Promise<boolean> {
  const { firestore, userId, profileId, fromCurrency, toCurrency } = options;

  const rate = await getExchangeRate(fromCurrency, toCurrency);
  if (!rate) {
    throw new Error("Could not fetch exchange rate. Conversion failed.");
  }

  const basePath = `users/${userId}/userProfiles/${profileId}`;
  const batch = writeBatch(firestore);

  try {
    // 1. Convert Incomes (amount)
    const incomesRef = collection(firestore, `${basePath}/incomes`);
    const incomesSnap = await getDocs(incomesRef);
    incomesSnap.forEach((docSnap: any) => {
      const data = docSnap.data();
      if (typeof data.amount === "number") {
        batch.update(docSnap.ref, {
          amount: data.amount * rate
        });
      }
    });

    // 2. Convert Expenses (amount)
    const expensesRef = collection(firestore, `${basePath}/expenses`);
    const expensesSnap = await getDocs(expensesRef);
    expensesSnap.forEach((docSnap: any) => {
      const data = docSnap.data();
      if (typeof data.amount === "number") {
        batch.update(docSnap.ref, {
          amount: data.amount * rate
        });
      }
    });

    // 3. Convert Transactions (amount)
    const transactionsRef = collection(firestore, `${basePath}/transactions`);
    const transactionsSnap = await getDocs(transactionsRef);
    transactionsSnap.forEach((docSnap: any) => {
      const data = docSnap.data();
      if (typeof data.amount === "number") {
        batch.update(docSnap.ref, {
          amount: data.amount * rate
        });
      }
    });

    // 4. Convert Debts (initialAmount, currentBalance, minimumPayment)
    const debtsRef = collection(firestore, `${basePath}/debts`);
    const debtsSnap = await getDocs(debtsRef);
    debtsSnap.forEach((docSnap: any) => {
      const data = docSnap.data();
      const updates: any = {};
      if (typeof data.initialAmount === "number") updates.initialAmount = data.initialAmount * rate;
      if (typeof data.currentBalance === "number") updates.currentBalance = data.currentBalance * rate;
      if (typeof data.minimumPayment === "number") updates.minimumPayment = data.minimumPayment * rate;
      
      if (Object.keys(updates).length > 0) {
        batch.update(docSnap.ref, updates);
      }
    });

    // 5. Convert Savings Accounts (currentAmount, goalAmount)
    const savingsRef = collection(firestore, `${basePath}/savingsAccounts`);
    const savingsSnap = await getDocs(savingsRef);
    savingsSnap.forEach((docSnap: any) => {
      const data = docSnap.data();
      const updates: any = {};
      if (typeof data.currentAmount === "number") updates.currentAmount = data.currentAmount * rate;
      if (typeof data.goalAmount === "number") updates.goalAmount = data.goalAmount * rate;
      
      if (Object.keys(updates).length > 0) {
        batch.update(docSnap.ref, updates);
      }
    });

    // Commit all updates
    await batch.commit();
    return true;

  } catch (error) {
    console.error("Error during batch conversion:", error);
    throw error;
  }
}
