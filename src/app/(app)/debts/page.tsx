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
import { PlusCircle } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { useProfile } from "@/context/ProfileContext"
import { collection } from "firebase/firestore"
import type { Debt } from "@/lib/types"
import Link from "next/link"
import { AdjustBalanceDialog } from "@/components/adjust-balance-dialog"
import { HistoryDialog } from "@/components/history-dialog"
import { useState, useMemo } from "react"
import { doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function DebtsPage() {
  const { user } = useUser();
  const { currentProfile, isLoading: isProfileLoading } = useProfile();
  const firestore = useFirestore();

  const debtsQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/debts`);
  }, [user, currentProfile, firestore]);

  const { data: debtData, isLoading } = useCollection<Debt>(debtsQuery);

  const totalDebt = debtData?.reduce((acc, curr) => acc + curr.currentBalance, 0) ?? 0;

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
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Debt Overview</CardTitle>
              <CardDescription>
                Total outstanding debt: <span className="font-bold text-destructive">${totalDebt.toLocaleString()}</span>
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1" disabled={isProfileLoading || !currentProfile} asChild>
              <Link href="/debts/add">
                <PlusCircle className="h-4 w-4" />
                Add Debt
              </Link>
            </Button>
          </div>
          <div className="mt-4 relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search debts..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
      </Card>

      {isLoading && <p>Loading debts...</p>}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {!isLoading && filteredAndSortedDebts.map((debt) => {
          const progress = (debt.currentBalance / debt.initialAmount) * 100;
          return (
            <Card key={debt.id}>
              <CardHeader>
                <CardTitle>{debt.name}</CardTitle>
                <CardDescription className="capitalize">{debt.type}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span className="font-semibold">${debt.currentBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Initial Amount</span>
                  <span className="font-semibold">${debt.initialAmount.toLocaleString()}</span>
                </div>
                <Progress value={100 - progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{(100 - progress).toFixed(1)}% paid off</p>
                <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => handleAdjustClick(debt as Debt & { id: string })}>
                  Adjust Balance
                </Button>
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleHistoryClick(debt.name)}
                  >
                    History
                  </Button>
                </div>
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
