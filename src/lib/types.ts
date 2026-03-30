export type UserProfile = {
  userId: string;
  name: string;
  description?: string;
  expenseCategories?: string[];
  createdAt: any;
  updatedAt: any;
};

export type Income = {
  profileId: string;
  amount: number;
  date: string;
  source: string;
  client?: string;
  description?: string;
  createdAt: any;
  updatedAt: any;
};

export type Expense = {
  profileId: string;
  amount: number;
  date: string;
  category: string;
  itemService: string;
  frequency: string;
  description?: string;
  createdAt: any;
  updatedAt: any;
};

export type SavingsAccount = {
  profileId: string;
  name: string;
  type: string;
  currentAmount: number;
  goalAmount?: number;
  description?: string;
  createdAt: any;
  updatedAt: any;
};

export type Debt = {
  profileId: string;
  name: string;
  type: string;
  initialAmount: number;
  currentBalance: number;
  interestRate?: number;
  minimumPayment?: number;
  dueDate?: string;
  description?: string;
  createdAt: any;
  updatedAt: any;
};

export type Transaction = {
  profileId: string;
  amount: number;
  date: string;
  type: string;
  modeOfPayment: string;
  category: string;
  recipientSender: string;
  description?: string;
  incomeId?: string;
  expenseId?: string;
  createdAt: any;
  updatedAt: any;
};


export type ReportData = {
  name: string;
  income: number;
  expenses: number;
};
