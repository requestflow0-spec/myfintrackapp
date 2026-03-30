"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Wallet, TrendingUp } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { useProfile } from "@/context/ProfileContext"
import { collection } from "firebase/firestore"
import type { SavingsAccount } from "@/lib/types"
import Link from "next/link"
import { AdjustBalanceDialog } from "@/components/adjust-balance-dialog"
import { HistoryDialog } from "@/components/history-dialog"
import { useState, useMemo } from "react"
import { doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

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
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Savings Overview</CardTitle>
              <CardDescription>
                Total savings amount: <span className="font-bold text-primary">${totalSavings.toLocaleString()}</span>
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1" disabled={isProfileLoading || !currentProfile} asChild>
              <Link href="/savings/add">
                <PlusCircle className="h-4 w-4" />
                Add Savings
              </Link>
            </Button>
          </div>
          <div className="mt-4 relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search savings accounts..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
      </Card>

      {isLoading && <p>Loading savings...</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!isLoading && filteredAndSortedSavings.map((saving) => (
          <Card key={saving.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-md font-medium">{saving.name}</CardTitle>
              {saving.type === 'cash' ? <Wallet className="h-5 w-5 text-muted-foreground" /> : <TrendingUp className="h-5 w-5 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${saving.currentAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground capitalize">in {saving.type}</p>
              {saving.description && <p className="text-xs text-muted-foreground">{saving.description}</p>}
              <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => handleAdjustClick(saving as SavingsAccount & { id: string })}>
                Adjust Balance
              </Button>
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleHistoryClick(saving.name)}
                >
                  History
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
