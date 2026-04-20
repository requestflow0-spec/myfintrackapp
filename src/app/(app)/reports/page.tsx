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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Pie, PieChart, Cell } from "recharts"
import { DollarSign, Wallet, FileText, ArrowUpDown, TrendingUp, ChevronDown, Printer } from "lucide-react"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import { collection } from '@/appwrite'
import type { Income, Expense, Transaction, Debt, SavingsAccount } from "@/lib/types"
import { cn, getCurrencySymbol } from "@/lib/utils"
import { useState, useMemo } from "react"
import { DatePickerWithRange } from "@/components/date-range-picker"
import { ExportButton } from "@/components/export-button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addDays, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ReportsPage() {
  const { user } = useUser();
  const { currentProfile, isLoading: isProfileLoading } = useProfile();
  const firestore = useFirestore();

  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date | undefined;
  }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const setPresetDateRange = (preset: 'daily' | 'weekly' | 'monthly' | 'annually') => {
    const today = new Date();
    switch (preset) {
      case 'daily':
        setDateRange({ from: startOfDay(today), to: endOfDay(today) });
        break;
      case 'weekly':
        setDateRange({ from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) });
        break;
      case 'monthly':
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
        break;
      case 'annually':
        setDateRange({ from: startOfYear(today), to: endOfYear(today) });
        break;
    }
  };

  // Filters String
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all', 'income', 'expense'
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | null, direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });

  // Fetch all required data
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

  // Filter Data based on date range, types, and search
  const filteredTransactions = useMemo(() => {
    if (!transactionData) return [];
    
    return transactionData.filter(tx => {
      const txDate = new Date(tx.date);
      // Date Range Match
      if (dateRange?.from) {
        if (txDate < dateRange.from) return false;
      }
      if (dateRange?.to) {
        if (txDate > dateRange.to) return false;
      }

      // Type Match
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

      // Search Match
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          tx.recipientSender.toLowerCase().includes(query) ||
          (tx.description && tx.description.toLowerCase().includes(query)) ||
          tx.category.toLowerCase().includes(query)
        );
      }

      return true;
    }).sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [transactionData, dateRange, typeFilter, categoryFilter, searchQuery, sortConfig]);

  // Cash Flow / Stock Evaluation Metrics
  const totalEarned = filteredTransactions
    .filter(t => t.type === 'income' && t.category !== 'Savings' && t.category !== 'Debt')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const moneySpent = filteredTransactions
    .filter(t => t.type === 'expense' && t.category !== 'Savings' && t.category !== 'Debt')
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const savedAmountDeposits = filteredTransactions.filter(t => t.type === 'income' && t.category === 'Savings').reduce((acc, curr) => acc + curr.amount, 0);
  const savedAmountWithdrawals = filteredTransactions.filter(t => t.type === 'expense' && t.category === 'Savings').reduce((acc, curr) => acc + curr.amount, 0);
  const netSavedAmount = savedAmountDeposits - savedAmountWithdrawals;

  const debtRepaid = filteredTransactions.filter(t => t.type === 'expense' && t.category === 'Debt').reduce((acc, curr) => acc + curr.amount, 0);
  const debtBorrowMore = filteredTransactions.filter(t => t.type === 'income' && t.category === 'Debt').reduce((acc, curr) => acc + curr.amount, 0);
  const netDebtRepaid = debtRepaid - debtBorrowMore;

  const netProfit = totalEarned - moneySpent;
  const profitMargin = totalEarned > 0 ? (netProfit / totalEarned) * 100 : 0;
  
  // Aggregate existing Debt (Total current balance regardless of filters)
  const totalDebts = debtData?.reduce((acc, curr) => acc + curr.currentBalance, 0) ?? 0;

  // Visualizations Data Preparation
  const categoryBarData = useMemo(() => {
    const dataMap: Record<string, { income: number, expense: number }> = {};
    
    filteredTransactions.forEach(tx => {
      const cat = tx.category || 'Uncategorized';
      if (!dataMap[cat]) dataMap[cat] = { income: 0, expense: 0 };
      
      if (tx.type === 'income') {
        dataMap[cat].income += tx.amount;
      } else {
        dataMap[cat].expense += tx.amount;
      }
    });

    return Object.keys(dataMap).sort().map(category => ({
      category,
      Income: dataMap[category].income,
      Expense: dataMap[category].expense,
    }));
  }, [filteredTransactions]);

  const categoryPieData = useMemo(() => {
    const expenseDataMap: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(tx => {
       if (!expenseDataMap[tx.category]) expenseDataMap[tx.category] = 0;
       expenseDataMap[tx.category] += tx.amount;
    });

    const colors = [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
      '#14b8a6', '#ec4899', '#f97316', '#84cc16', '#6366f1'
    ];
    return Object.keys(expenseDataMap).map((key, i) => ({
      name: key,
      value: expenseDataMap[key],
      color: colors[i % colors.length]
    })).sort((a,b) => b.value - a.value); // Sort highest first
  }, [filteredTransactions]);

  const allAvailableCategories = Array.from(new Set(transactionData?.map(t => t.category) || []));

  const handleSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlToPrint = `
      <html>
        <head>
          <title>Comprehensive Ledger</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
            th { background-color: #f4f4f5; font-weight: 600; }
            .header { margin-bottom: 20px; }
            .header h2 { margin: 0 0 10px 0; font-size: 24px; }
            .header p { margin: 0; color: #555; }
            .text-right { text-align: right; }
            .font-medium { font-weight: 500; }
            .text-sm { font-size: 12px; color: #666; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Comprehensive Ledger</h2>
            <p>Filter: ${typeFilter === 'all' ? 'All Types' : typeFilter === 'income' ? 'Income' : 'Expense'} | Category: ${categoryFilter === 'all' ? 'All Categories' : categoryFilter}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Recipient/Sender</th>
                <th>Category</th>
                <th>Type</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(tx => `
                <tr>
                  <td style="white-space: nowrap;">${tx.date}</td>
                  <td>
                    <div class="font-medium">${tx.recipientSender}</div>
                    ${tx.description ? `<div class="text-sm">${tx.description}</div>` : ''}
                  </td>
                  <td>${tx.category}</td>
                  <td style="text-transform: capitalize;">${tx.type}</td>
                  <td class="text-right font-medium">
                    ${tx.type === 'income' ? '+' : '-'}${getCurrencySymbol(currentProfile?.currency)}${tx.amount.toLocaleString()}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlToPrint);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-extrabold font-display tracking-tight mb-2">Financial Performance</h2>
          <p className="text-lg font-medium text-muted-foreground/80">Detailed breakdown of your liquidity, savings architecture, and capital allocation.</p>
        </div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full xl:w-auto">
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  Time Period <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setPresetDateRange('daily')}>Daily</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPresetDateRange('weekly')}>Weekly</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPresetDateRange('monthly')}>Monthly</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPresetDateRange('annually')}>Annually</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DatePickerWithRange date={dateRange as any} setDate={setDateRange as any} />
            <ExportButton data={filteredTransactions} filename="fintrack_report" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mb-8">
        <Card className="bg-surface-low border-none shadow-none rounded-[24px]">
          <CardContent className="p-8">
            <h3 className="text-xs font-bold tracking-widest uppercase text-primary/80 mb-2 flex items-center justify-between">
              Net Profit
              <DollarSign className="h-4 w-4 text-muted-foreground/50" />
            </h3>
            <div className="text-4xl font-extrabold font-display tracking-tight text-foreground">{getCurrencySymbol(currentProfile?.currency)}{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {totalEarned > 0 && (
              <p className={cn("text-sm font-bold mt-3", profitMargin > 0 ? "text-emerald-600" : "text-destructive")}>
                {profitMargin > 0 ? '+' : ''}{profitMargin.toFixed(1)}% margin
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-surface-low border-none shadow-none rounded-[24px]">
          <CardContent className="p-8">
            <h3 className="text-xs font-bold tracking-widest uppercase text-primary/80 mb-2 flex items-center justify-between">
              Cash Flow
              <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />
            </h3>
            <div className="text-4xl font-extrabold font-display tracking-tight text-foreground">{getCurrencySymbol(currentProfile?.currency)}{totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-sm font-bold mt-3 text-muted-foreground">
               <span className="text-destructive">- {getCurrencySymbol(currentProfile?.currency)}{moneySpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> outflow
            </p>
          </CardContent>
        </Card>
        <Card className="bg-surface-low border-none shadow-none rounded-[24px]">
          <CardContent className="p-8">
            <h3 className="text-xs font-bold tracking-widest uppercase text-primary/80 mb-2 flex items-center justify-between">
              Savings Rate
              <Wallet className="h-4 w-4 text-muted-foreground/50" />
            </h3>
            <div className="text-4xl font-extrabold font-display tracking-tight text-foreground">
              {(totalEarned > 0 ? (netSavedAmount / totalEarned) * 100 : 0).toFixed(1)}%
            </div>
            <p className="text-sm font-bold mt-3 text-emerald-600">
               {netSavedAmount > 0 ? '+' : ''}{getCurrencySymbol(currentProfile?.currency)}{netSavedAmount.toLocaleString()} net saved
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 max-h-[450px] flex flex-col bg-card border-none shadow-sm rounded-[24px]">
          <CardHeader className="px-8 pt-8">
            <CardTitle className="text-xl font-bold font-display">Income vs. Expenses</CardTitle>
            <CardDescription className="font-medium">Monthly trajectory analysis</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-8 px-8">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <BarChart data={categoryBarData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="category" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600}}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600}}
                  tickFormatter={(value) => `${getCurrencySymbol(currentProfile?.currency)}${value}`}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--surface-low))', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }} />
                <Bar dataKey="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="Expense" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-4 lg:col-span-3 max-h-[450px] flex flex-col bg-card border-none shadow-sm rounded-[24px]">
          <CardHeader className="px-8 pt-8">
            <CardTitle className="text-xl font-bold font-display">Expense By Category</CardTitle>
            <CardDescription className="font-medium">Structural distribution</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            {categoryPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <PieChart>
                  <RechartsTooltip 
                    formatter={(value: number) => `${getCurrencySymbol(currentProfile?.currency)}${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full min-h-[300px] text-muted-foreground">
                    No expense data for this period.
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 bg-card border-none shadow-sm rounded-[24px]">
        <div className="px-8 pt-8 pb-4 border-b border-surface-low/50">
          <h3 className="text-xl font-bold font-display">Comprehensive Ledger</h3>
          <p className="text-sm font-medium text-muted-foreground mt-1">Verified historical transaction records</p>
        </div>
        <div className="p-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search description, recipient, category..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allAvailableCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>

          <div className="border-none mt-2">
            <Table className="border-none">
              <TableHeader className="[&_tr]:border-none">
                <TableRow className="hover:bg-transparent uppercase text-[10px] tracking-widest font-bold text-muted-foreground/50 border-b border-surface-low/50">
                  <TableHead className="h-12 cursor-pointer hover:text-primary transition-colors pl-4" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3"/></div>
                  </TableHead>
                  <TableHead className="h-12 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('recipientSender')}>
                    <div className="flex items-center gap-1">Description <ArrowUpDown className="h-3 w-3"/></div>
                  </TableHead>
                  <TableHead className="h-12 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1">Category <ArrowUpDown className="h-3 w-3"/></div>
                  </TableHead>
                  <TableHead className="h-12 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-1">Method/Status <ArrowUpDown className="h-3 w-3"/></div>
                  </TableHead>
                  <TableHead className="h-12 text-right cursor-pointer hover:text-primary transition-colors pr-4" onClick={() => handleSort('amount')}>
                    <div className="flex items-center justify-end gap-1">Amount <ArrowUpDown className="h-3 w-3"/></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:border-none">
                {transactionsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 font-display text-muted-foreground italic">Curating your movements...</TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 font-display text-muted-foreground italic">No movements found matching your curation.</TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/30 transition-all border-b border-surface-low/30 last:border-0 group">
                      <TableCell className="py-5 font-semibold text-muted-foreground/70 group-hover:text-foreground transition-colors pl-4">{tx.date}</TableCell>
                      <TableCell className="py-5">
                        <div className="font-bold text-foreground">{tx.recipientSender}</div>
                        {tx.description && <div className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mt-0.5">{tx.description}</div>}
                      </TableCell>
                      <TableCell className="py-5">
                         <span className="px-2 py-1 bg-surface-low rounded-md text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tx.category}</span>
                      </TableCell>
                      <TableCell className="py-5">
                         <div className="text-sm font-medium text-muted-foreground capitalize">{tx.modeOfPayment}</div>
                         <div className={cn("inline-block w-1.5 h-1.5 rounded-full mt-2", tx.type === 'income' ? 'bg-emerald-500' : 'bg-destructive')} />
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-extrabold tracking-tight text-lg py-5 pr-4",
                        tx.type === 'income' ? "text-foreground" : "text-foreground"
                      )}>
                        {tx.type === 'income' ? "+" : "-"}{getCurrencySymbol(currentProfile?.currency)}{tx.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
