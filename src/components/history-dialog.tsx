"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import { collection, query, where, orderBy } from '@/appwrite'
import type { Transaction } from "@/lib/types"
import { format } from "date-fns"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getCurrencySymbol } from "@/lib/utils"

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: 'savings' | 'debt';
  itemName: string;
  itemId?: string; // Optional if we want to query by ID instead of name
}

export function HistoryDialog({ open, onOpenChange, itemType, itemName, itemId }: HistoryDialogProps) {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(() => {
    if (!user || !currentProfile || !open) return null;
    const q = collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/transactions`);
    return q;
  }, [user, currentProfile, firestore, open]);

  const { data: allTransactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  const history = useMemo(() => {
    if (!allTransactions) return [];
    
    // Filter locally since Firestore requires composite indexes for complex queries (where + orderBy)
    return allTransactions
      .filter(t => {
        if (itemType === 'savings') {
          return t.category === 'Savings' && t.recipientSender === itemName;
        } else if (itemType === 'debt') {
          return t.category === 'Debt' && t.recipientSender === itemName;
        }
        return false;
      })
      .sort((a, b) => {
        // Sort by date descending
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        // Fallback to createdAt
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
  }, [allTransactions, itemType, itemName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>History: {itemName}</DialogTitle>
          <DialogDescription>
            Recent adjustments and records for this {itemType === 'savings' ? 'savings account' : 'debt'}.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground mt-4">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground mt-4">No history records found.</p>
          ) : (
            <div className="space-y-4">
              {history.map((tx) => {
                // Determine if it was an increase or decrease
                // For Savings: deposit is income, withdrawal is expense
                // For Debt: paying off is expense, borrowing more is income
                // But let's look at `type` ('income' vs 'expense') to decide the icon and color.
                const isPositive = tx.type === 'income';
                
                return (
                  <div key={tx.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {isPositive ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{tx.description || 'Adjustment'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(tx.date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : '-'}{getCurrencySymbol(currentProfile?.currency)}{tx.amount.toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
