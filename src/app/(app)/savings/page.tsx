"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Wallet, TrendingUp, History } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import { collection } from '@/appwrite'
import type { SavingsAccount } from "@/lib/types"
import Link from "next/link"
import { AdjustBalanceDialog } from "@/components/adjust-balance-dialog"
import { HistoryDialog } from "@/components/history-dialog"
import { useState, useMemo } from "react"
import { doc, updateDoc, addDoc, serverTimestamp } from '@/appwrite'
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { getCurrencySymbol } from "@/lib/utils"

export default function SavingsPage() {
  const { user } = useUser();
  const { currentProfile, isLoading: isProfileLoading } = useProfile();
  const firestore = useFirestore();

  const savingsQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/savingsAccounts`);
  }, [user, currentProfile, firestore]);

  const { data: savingsData, isLoading } = useCollection<SavingsAccount>(savingsQuery);

  const totalSavings = savingsData?.reduce((acc, curr) => acc + curr.currentAmount, 0) ?? 0

  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndSortedSavings = useMemo(() => {
    if (!savingsData) return [];
    
    // Filter
    const filtered = savingsData.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by createdAt descending (newest first). Since createdAt is a Firestore Timestamp, we need to handle it.
    return filtered.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  }, [savingsData, searchQuery]);

  const [selectedSaving, setSelectedSaving] = useState<{ id: string, name: string, currentAmount: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [savingForHistory, setSavingForHistory] = useState<string>("");

  const handleAdjustClick = (saving: SavingsAccount & { id: string }) => {
    setSelectedSaving({ id: saving.id, name: saving.name, currentAmount: saving.currentAmount });
    setDialogOpen(true);
  };

  const handleConfirmAdjust = async (values: any) => {
    if (!user || !currentProfile || !selectedSaving) return;

    const newAmount = values.operation === 'increase'
      ? selectedSaving.currentAmount + values.amount
      : selectedSaving.currentAmount - values.amount;

    if (newAmount < 0) {
      toast({
        title: "Error",
        description: "Insufficient funds for this withdrawal.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Update Savings Account
      const savingRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/savingsAccounts/${selectedSaving.id}`);
      await updateDoc(savingRef, {
        currentAmount: newAmount,
        updatedAt: serverTimestamp()
      });

      // 2. Create Transaction
      const transactionsCol = collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/transactions`);
      await addDoc(transactionsCol, {
        profileId: currentProfile.id,
        amount: values.amount,
        date: values.date.toISOString().split('T')[0],
        type: values.operation === 'increase' ? 'income' : 'expense', // Deposit = Income, Withdrawal = Expense
        // Actually, user might prefer 'Transfer' but for now let's map to Income/Expense or use a custom type if system supports it.
        // Re-reading implementation plan: logical typing.
        // Let's use 'transfer' if possible, or 'expense'/'income' with clear description.
        // The system types are likely strict. Let's check types again? 
        // `type` is string in types.tsx.
        // Let's use 'transfer' for now, or fallback to 'expense'/'income' based on flow.
        // Actually, for a personal finance tracker:
        // Deposit to Savings = Money leaves 'Cash/Bank' -> Goes to 'Savings'. It's a Transfer.
        // But if we only track 'Income' and 'Expense' categories, it might be tricky.
        // Let's call it 'transfer' and set category to 'Savings'.
        modeOfPayment: 'Bank Transfer', // Defaulting
        category: 'Savings',
        recipientSender: selectedSaving.name,
        description: values.description || (values.operation === 'increase' ? `Deposit to ${selectedSaving.name}` : `Withdrawal from ${selectedSaving.name}`),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Success",
        description: "Savings balance updated successfully.",
      });
      setDialogOpen(false);
    } catch (error) {
      console.error("Error updating savings:", error);
      toast({
        title: "Error",
        description: "Failed to update savings.",
        variant: "destructive",
      });
    }
  };

  const handleHistoryClick = (savingName: string) => {
    setSavingForHistory(savingName);
    setHistoryDialogOpen(true);
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-sm font-bold tracking-widest uppercase text-primary/80 mb-1">Lumina Finance</h2>
          <h2 className="text-4xl font-extrabold font-display tracking-tight">Savings Overview</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-4xl font-extrabold text-primary">{getCurrencySymbol(currentProfile?.currency)}{totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {totalSavings > 0 && <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold tracking-wider">Active</span>}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search savings goals..."
              className="pl-9 bg-surface-low border-none shadow-none h-11 rounded-xl font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="lg" className="rounded-xl px-6 font-semibold h-11 shadow-md shadow-primary/20" disabled={isProfileLoading || !currentProfile} asChild>
            <Link href="/savings/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Savings Goal
            </Link>
          </Button>
        </div>
      </div>

      {isLoading && <p>Loading savings...</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!isLoading && filteredAndSortedSavings.map((saving) => (
          <Card key={saving.id} className="bg-card border-none shadow-sm rounded-[24px] overflow-hidden flex flex-col group hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 px-6 pt-6">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {saving.type === 'cash' ? <Wallet className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />}
              </div>
              <div className="px-3 py-1 rounded-full bg-surface-low text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {saving.type}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col px-6 pb-6 pt-4">
              <div className="space-y-1 mb-6 flex-1">
                <CardTitle className="text-xl font-bold leading-tight">{saving.name}</CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-1">{saving.description || 'No description'}</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-extrabold tracking-tight">{getCurrencySymbol(currentProfile?.currency)}{saving.currentAmount.toLocaleString()}</div>
                  {saving.goalAmount ? (
                    <div className="text-xs font-bold text-primary">
                      {Math.round((saving.currentAmount / saving.goalAmount) * 100)}% of {getCurrencySymbol(currentProfile?.currency)}{(saving.goalAmount >= 1000 ? (saving.goalAmount / 1000).toFixed(0) + 'k' : saving.goalAmount)}
                    </div>
                  ) : null}
                </div>
                {saving.goalAmount ? (
                  <div className="h-1.5 w-full bg-surface-low rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, (saving.currentAmount / saving.goalAmount) * 100))}%` }} />
                  </div>
                ) : (
                  <div className="h-1.5 w-full bg-transparent" />
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary font-bold shadow-none" onClick={() => handleAdjustClick(saving as SavingsAccount & { id: string })}>
                  Adjust Balance
                </Button>
                <Button 
                  variant="secondary" 
                  size="icon"
                  className="rounded-xl w-10 h-10 bg-primary/5 hover:bg-primary/10 text-primary shadow-none flex-shrink-0"
                  onClick={() => handleHistoryClick(saving.name)}
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && filteredAndSortedSavings.length === 0 && (
          <p className="text-center col-span-3">
            {savingsData && savingsData.length > 0 ? "No saving accounts found matching your search." : "No saving records found."}
          </p>
        )}
      </div>

      {selectedSaving && (
        <AdjustBalanceDialog
          item={selectedSaving}
          type="savings"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onConfirm={handleConfirmAdjust}
        />
      )}

      <HistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        itemType="savings"
        itemName={savingForHistory}
      />
    </div>
  )
}
