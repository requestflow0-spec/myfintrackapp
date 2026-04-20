"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { monthlyReport } from "@/lib/data"
import { DollarSign, Wallet } from "lucide-react"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import { collection } from '@/appwrite'
import type { Income, Expense, Transaction, Debt, SavingsAccount } from "@/lib/types"
import { cn, getCurrencySymbol } from "@/lib/utils"
import { useReminders } from "@/hooks/use-reminders"
import { Bell, AlertCircle, Calendar } from "lucide-react"

export default function DashboardPage() {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();

  const incomesQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/incomes`);
  }, [user, currentProfile, firestore]);

  const { data: incomeData } = useCollection<Income>(incomesQuery);

  const expensesQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/expenses`);
  }, [user, currentProfile, firestore]);

  const { data: expenseData } = useCollection<Expense>(expensesQuery);

  const transactionsQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/transactions`);
  }, [user, currentProfile, firestore]);

  const { data: transactionData, isLoading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const debtsQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/debts`);
  }, [user, currentProfile, firestore]);
  const { data: debtData } = useCollection<Debt>(debtsQuery);

  const savingsQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/savingsAccounts`);
  }, [user, currentProfile, firestore]);
  const { data: savingsData } = useCollection<SavingsAccount>(savingsQuery);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const thisMonthIncomes = incomeData?.filter(i => { const d = new Date(i.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((acc, curr) => acc + curr.amount, 0) ?? 0;
  const lastMonthIncomes = incomeData?.filter(i => { const d = new Date(i.date); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear; }).reduce((acc, curr) => acc + curr.amount, 0) ?? 0;

  const incomePercentageChange = lastMonthIncomes === 0 ? (thisMonthIncomes > 0 ? 100 : 0) : ((thisMonthIncomes - lastMonthIncomes) / lastMonthIncomes) * 100;

  const thisMonthExpenses = expenseData?.filter(e => { const d = new Date(e.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((acc, curr) => acc + curr.amount, 0) ?? 0;
  const lastMonthExpenses = expenseData?.filter(e => { const d = new Date(e.date); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear; }).reduce((acc, curr) => acc + curr.amount, 0) ?? 0;

  const expensePercentageChange = lastMonthExpenses === 0 ? (thisMonthExpenses > 0 ? 100 : 0) : ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;

  const totalIncome = incomeData?.reduce((acc, curr) => acc + curr.amount, 0) ?? 0;
  const totalExpenses = expenseData?.reduce((acc, curr) => acc + curr.amount, 0) ?? 0;
  const totalDebts = debtData?.reduce((acc, curr) => acc + curr.currentBalance, 0) ?? 0;
  const totalSavings = savingsData?.reduce((acc, curr) => acc + curr.currentAmount, 0) ?? 0;

  const profit = totalIncome - totalExpenses
  const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0
  
  const { reminders } = useReminders(7);

  const pieData = [
    { name: 'Income', value: totalIncome, color: '#22c55e' }, // green-500
    { name: 'Expenses', value: totalExpenses, color: '#ef4444' }, // red-500
    { name: 'Debts', value: totalDebts, color: '#f97316' }, // orange-500
    { name: 'Savings', value: totalSavings, color: '#3b82f6' }, // blue-500
  ].filter(item => item.value > 0);

  const chartConfig = {
    income: { label: "Income", color: "hsl(var(--chart-1))" },
    expenses: { label: "Expenses", color: "hsl(var(--chart-2))" },
    debts: { label: "Debts", color: "hsl(var(--chart-3))" },
    savings: { label: "Savings", color: "hsl(var(--chart-4))" },
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-none shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold font-display tracking-tight">{getCurrencySymbol(currentProfile?.currency)}{totalIncome.toLocaleString()}</div>
            <p className={cn("text-xs mt-1", incomePercentageChange >= 0 ? "text-emerald-500" : "text-destructive")}>
              {incomePercentageChange > 0 ? '+' : ''}{incomePercentageChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
        <Card className="bg-surface-low border-none shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Total Expenses</CardTitle>
            <Wallet className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold font-display tracking-tight">{getCurrencySymbol(currentProfile?.currency)}{totalExpenses.toLocaleString()}</div>
            <p className={cn("text-xs mt-1", expensePercentageChange <= 0 ? "text-emerald-500" : "text-destructive")}>
              {expensePercentageChange > 0 ? '+' : ''}{expensePercentageChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
        <Card className="bg-surface-low border-none shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Profit / Loss</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-3xl font-extrabold font-display tracking-tight",
              profit >= 0 ? "text-primary" : "text-destructive"
            )}>
              {getCurrencySymbol(currentProfile?.currency)}{profit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Analysis of your finances</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground border-none shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-80 uppercase tracking-widest">Profit Margin</CardTitle>
            <DollarSign className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold font-display tracking-tight">
              {profitMargin.toFixed(2)}%
            </div>
            <p className="text-xs opacity-70 mt-1">Efficiency of profit generation</p>
          </CardContent>
        </Card>
      </div>
      
      {reminders && reminders.length > 0 && (
        <Card className="bg-amber-500/10 border border-amber-500/20 shadow-none">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2">
              <Bell className="h-4 w-4" /> Attention Required: Upcoming Bills & Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
             <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="bg-background rounded-xl p-4 shadow-sm border border-border/50 flex flex-col justify-between">
                     <div className="flex items-start justify-between mb-2">
                       <span className={cn(
                          "uppercase text-[9px] px-2 py-0.5 font-bold tracking-wider rounded-md",
                          reminder.type === 'bill' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                       )}>
                         {reminder.type.replace('_', ' ')}
                       </span>
                       <Calendar className="h-4 w-4 text-muted-foreground/60"/>
                     </div>
                     <p className="font-bold text-foreground line-clamp-1">{reminder.title}</p>
                     <div className="mt-4 flex justify-between items-end">
                       <div>
                         {reminder.amount ? (
                           <p className="font-extrabold font-display text-lg tracking-tight text-foreground">{getCurrencySymbol(currentProfile?.currency)}{reminder.amount.toLocaleString()}</p>
                         ) : (
                           <p className="font-medium text-xs text-muted-foreground">Amount varies</p>
                         )}
                       </div>
                       <div className="text-xs font-semibold text-amber-500">
                         {new Date(reminder.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                       </div>
                     </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value: number) => `${getCurrencySymbol(currentProfile?.currency)}${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius="90%"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              You have {transactionData?.length ?? 0} transactions this month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? <p>Loading transactions...</p> :
              <Table className="border-none">
                <TableHeader className="[&_tr]:border-none">
                  <TableRow className="hover:bg-transparent uppercase text-[10px] tracking-widest text-muted-foreground">
                    <TableHead className="h-10">Recipient</TableHead>
                    <TableHead className="text-right h-10">Amount</TableHead>
                    <TableHead className="h-10">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:border-none">
                  {transactionData && transactionData.slice(0, 5).map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="py-4">
                        <div className="font-semibold text-foreground">{transaction.recipientSender}</div>
                        <div className="text-xs text-muted-foreground font-medium">{transaction.date}</div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-bold font-display",
                        transaction.type === 'income' ? "text-primary" : "text-destructive"
                      )}>
                        {transaction.type === 'income' ? "+" : "-"}{getCurrencySymbol(currentProfile?.currency)}{transaction.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className="text-[10px] px-2 py-0 h-5 font-bold uppercase tracking-wider rounded-full">
                          {transaction.type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!transactionData || transactionData.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground font-medium italic">No recent transactions.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            }
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
