"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PlusCircle, Building2, CreditCard, GraduationCap, History, Landmark, TrendingUp, TrendingDown } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import { collection } from '@/appwrite'
import type { Debt, Transaction } from "@/lib/types"
import Link from "next/link"
import { AdjustBalanceDialog } from "@/components/adjust-balance-dialog"
import { HistoryDialog } from "@/components/history-dialog"
import { useState, useMemo } from "react"
import { doc, updateDoc, addDoc, serverTimestamp } from '@/appwrite'
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { getCurrencySymbol } from "@/lib/utils"

export default function DebtsPage() {
  const { user } = useUser();
  const { currentProfile, isLoading: isProfileLoading } = useProfile();
  const firestore = useFirestore();

  const debtsQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/debts`);
  }, [user, currentProfile, firestore]);

  const { data: debtData, isLoading } = useCollection<Debt>(debtsQuery);

  const transactionsQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/transactions`);
  }, [user, currentProfile, firestore]);

  const { data: transactionData } = useCollection<Transaction>(transactionsQuery);

  const debtTrend = useMemo(() => {
    if (!debtData || !transactionData) return null;
    
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const pastMonthDebtTx = transactionData.filter(tx => 
      tx.category === 'Debt' && new Date(tx.date) >= oneMonthAgo
    );

    let netDebtChangePastMonth = 0;
    pastMonthDebtTx.forEach(tx => {
      if (tx.type === 'expense') {
        netDebtChangePastMonth -= tx.amount;
      } else if (tx.type === 'income') {
        netDebtChangePastMonth += tx.amount;
      }
    });

    const currentTotalDebt = debtData.reduce((acc, curr) => acc + curr.currentBalance, 0);
    const totalDebtOneMonthAgo = currentTotalDebt - netDebtChangePastMonth;

    if (totalDebtOneMonthAgo === 0) {
      if (currentTotalDebt > 0) return { percentage: "+100", isDecreased: false };
      return null;
    }

    const percentageChange = ((currentTotalDebt - totalDebtOneMonthAgo) / totalDebtOneMonthAgo) * 100;
    return {
      percentage: Math.abs(percentageChange).toFixed(1),
      isDecreased: percentageChange < 0
    };
  }, [debtData, transactionData]);

  const totalDebt = debtData?.reduce((acc, curr) => acc + curr.currentBalance, 0) ?? 0;
  const totalInitialDebt = debtData?.reduce((acc, curr) => acc + curr.initialAmount, 0) ?? 0;
  
  const overallProgress = totalInitialDebt > 0 ? ((totalInitialDebt - totalDebt) / totalInitialDebt) * 100 : 0;
  const amountPaidOff = totalInitialDebt > 0 ? totalInitialDebt - totalDebt : 0;

  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndSortedDebts = useMemo(() => {
    if (!debtData) return [];
    
    // Filter
    const filtered = debtData.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by createdAt descending (newest first)
    return filtered.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  }, [debtData, searchQuery]);

  const [selectedDebt, setSelectedDebt] = useState<{ id: string, name: string, currentAmount: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [debtForHistory, setDebtForHistory] = useState<string>("");

  const handleAdjustClick = (debt: Debt & { id: string }) => {
    setSelectedDebt({ id: debt.id, name: debt.name, currentAmount: debt.currentBalance });
    setDialogOpen(true);
  };

  const handleConfirmAdjust = async (values: any) => {
    if (!user || !currentProfile || !selectedDebt) return;

    const newBalance = values.operation === 'increase'
      ? selectedDebt.currentAmount + values.amount
      : selectedDebt.currentAmount - values.amount;


    if (newBalance < 0) {
      toast({
        title: "Error",
        description: "Debt balance cannot be negative.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Update Debt Document
      const debtRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/debts/${selectedDebt.id}`);
      await updateDoc(debtRef, {
        currentBalance: newBalance,
        updatedAt: serverTimestamp()
      });

      // 2. Create Transaction
      const transactionsCol = collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/transactions`);
      await addDoc(transactionsCol, {
        profileId: currentProfile.id,
        amount: values.amount,
        date: values.date.toISOString().split('T')[0],
        type: values.operation === 'decrease' ? 'expense' : 'income', // Pay Off = Money out (Expense), Borrow More = Money in (Income/Loan)
        // Logic check:
        // Paying off debt: You lose cash, debt decreases. Type: Expense.
        // Borrowing more: You gain cash, debt increases. Type: Income (Loan).
        modeOfPayment: 'Cash', // Default
        category: 'Debt',
        recipientSender: selectedDebt.name,
        description: values.description || (values.operation === 'decrease' ? `Payment for ${selectedDebt.name}` : `Additional borrowing for ${selectedDebt.name}`),
        debtId: selectedDebt.id, // Optional linkage
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Success",
        description: "Debt balance updated successfully.",
      });
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating debt:", error);
      if (error.code === 'permission-denied') {
        console.error("Permission denied. Check Firestore rules.");
      }
      toast({
        title: "Error",
        description: "Failed to update debt.",
        variant: "destructive",
      });
    }
  };

  const handleHistoryClick = (debtName: string) => {
    setDebtForHistory(debtName);
    setHistoryDialogOpen(true);
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-4xl font-extrabold font-display tracking-tight">Debt Portfolio</h2>
          <p className="text-lg font-medium text-muted-foreground/80 mt-1">A curated overview of your financial liabilities and strategic payoff trajectory.</p>
        </div>
        <div className="flex gap-3">
          <Button size="lg" className="rounded-xl px-6 font-semibold h-11 shadow-md shadow-primary/20" disabled={isProfileLoading || !currentProfile} asChild>
            <Link href="/debts/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Account
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="bg-surface-low border-none shadow-none rounded-[24px]">
          <CardContent className="p-8">
            <h3 className="text-xs font-bold tracking-widest uppercase text-primary/80 mb-2">Total Outstanding</h3>
            <div className="text-4xl font-extrabold font-display tracking-tight text-foreground">{getCurrencySymbol(currentProfile?.currency)}{totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {debtTrend && (
              <div className={`flex items-center gap-1 mt-4 text-xs font-bold ${debtTrend.isDecreased ? 'text-emerald-500' : 'text-destructive'}`}>
                {debtTrend.isDecreased ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                <span>{debtTrend.percentage}% from last month</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-surface-low border-none shadow-none rounded-[24px]">
          <CardContent className="p-8 flex items-center justify-between h-full">
            <div className="flex-1 pr-8">
              <h3 className="text-xs font-bold tracking-widest uppercase text-primary/80 mb-2">Payoff Progress</h3>
              <div className="text-2xl font-bold mb-3">{overallProgress.toFixed(0)}% Goal Reached</div>
              <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1">Paid Off</p>
                <p className="text-lg font-bold text-emerald-600">{getCurrencySymbol(currentProfile?.currency)}{(amountPaidOff/1000).toFixed(1)}k</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold font-display">Active Accounts</h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search debt instruments..."
            className="pl-9 bg-surface-low border-none shadow-none h-10 rounded-xl font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading && <p>Loading debts...</p>}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {!isLoading && filteredAndSortedDebts.map((debt) => {
          const progress = debt.initialAmount > 0 ? ((debt.initialAmount - debt.currentBalance) / debt.initialAmount) * 100 : 0;
          return (
            <Card key={debt.id} className="bg-card border-none shadow-sm rounded-[24px] overflow-hidden flex flex-col group hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-start gap-4 pb-4 px-6 pt-6">
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-surface-low flex items-center justify-center text-primary">
                  <Landmark className="h-5 w-5 opacity-80" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <CardTitle className="text-lg font-bold leading-tight truncate">{debt.name}</CardTitle>
                  <CardDescription className="capitalize font-medium mt-1 truncate">{debt.type} • Init: {getCurrencySymbol(currentProfile?.currency)}{debt.initialAmount.toLocaleString()}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground/50 hover:text-primary" onClick={() => handleHistoryClick(debt.name)}>
                  <History className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col px-6 pb-6 pt-2">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1">Current Balance</p>
                    <div className="text-2xl font-extrabold tracking-tight text-foreground">{getCurrencySymbol(currentProfile?.currency)}{debt.currentBalance.toLocaleString()}</div>
                  </div>
                  {debt.interestRate !== undefined && (
                    <div className="text-right">
                      <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1">Interest Rate</p>
                      <div className="text-2xl font-extrabold tracking-tight text-emerald-600">{debt.interestRate}%</div>
                    </div>
                  )}
                </div>
                
                <Button variant="secondary" className="w-full rounded-xl bg-primary/5 hover:bg-primary/10 text-primary font-bold shadow-none group-hover:bg-primary group-hover:text-primary-foreground transition-colors" onClick={() => handleAdjustClick(debt as Debt & { id: string })}>
                  Make Payment
                </Button>
              </CardContent>
            </Card>
          )
        })}
        {!isLoading && filteredAndSortedDebts.length === 0 && (
          <p className="text-center col-span-2">
            {debtData && debtData.length > 0 ? "No debts found matching your search." : "No debt records found."}
          </p>
        )}
      </div>

      {selectedDebt && (
        <AdjustBalanceDialog
          item={selectedDebt}
          type="debt"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onConfirm={handleConfirmAdjust}
        />
      )}

      <HistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        itemType="debt"
        itemName={debtForHistory}
      />
    </div>
  )
}
