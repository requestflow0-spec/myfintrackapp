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
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { useProfile } from "@/context/ProfileContext"
import { collection } from "firebase/firestore"
import type { Income, Expense, Transaction, Debt, SavingsAccount } from "@/lib/types"
import { cn } from "@/lib/utils"

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

  const totalIncome = incomeData?.reduce((acc, curr) => acc + curr.amount, 0) ?? 0;
  const totalExpenses = expenseData?.reduce((acc, curr) => acc + curr.amount, 0) ?? 0;
  const totalDebts = debtData?.reduce((acc, curr) => acc + curr.currentBalance, 0) ?? 0;
  const totalSavings = savingsData?.reduce((acc, curr) => acc + curr.currentAmount, 0) ?? 0;

  const profit = totalIncome - totalExpenses
  const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit / Loss</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${profit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Analysis of your finances</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitMargin.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Efficiency of profit generation</p>
          </CardContent>
        </Card>
      </div>
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
                    formatter={(value: number) => `$${value.toLocaleString()}`}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionData && transactionData.slice(0, 5).map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="font-medium">{transaction.recipientSender}</div>
                        <div className="text-sm text-muted-foreground">{transaction.date}</div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-bold",
                        transaction.type === 'income' ? "text-green-600" : "text-red-600"
                      )}>
                        {transaction.type === 'income' ? "+" : "-"}${transaction.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className="text-xs capitalize">
                          {transaction.type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!transactionData || transactionData.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">No recent transactions.</TableCell>
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
