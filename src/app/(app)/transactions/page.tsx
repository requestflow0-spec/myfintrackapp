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
import { MoreHorizontal, PlusCircle, MinusCircle, TrendingUp } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import { collection, doc, deleteDoc } from '@/appwrite'
import type { Transaction } from "@/lib/types"
import { cn, getCurrencySymbol } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { DeleteDialog } from "@/components/delete-dialog"
import { useToast } from "@/hooks/use-toast"

export default function TransactionsPage() {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/transactions`);
  }, [user, currentProfile, firestore]);

  const { data: transactionData, isLoading } = useCollection<Transaction>(transactionsQuery);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const stats = useMemo(() => {
    if (!transactionData) return { totalAssets: 0, inflow: 0, burn: 0 };
    const totalAssets = transactionData.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const inflow = transactionData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const burn = transactionData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { totalAssets, inflow, burn };
  }, [transactionData]);

  const filteredAndSortedTransactions = useMemo(() => {
    if (!transactionData) return [];
    
    // Filter
    const filtered = transactionData.filter(t => 
      t.recipientSender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by date descending (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactionData, searchQuery]);

  const handleDeleteClick = (transaction: Transaction & { id?: string }) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!user || !currentProfile || !transactionToDelete || !(transactionToDelete as any).id) return;
    
    setIsDeleting(true);
    try {
      const transactionRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/transactions/${(transactionToDelete as any).id}`);
      await deleteDoc(transactionRef);
      toast({
        title: "Success",
        description: "Transaction deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 pb-10">
      {/* Editorial Header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary">Financial Editorial</p>
          <h2 className="text-5xl font-extrabold font-display tracking-tight text-foreground">Transactions</h2>
          <p className="text-lg font-medium text-muted-foreground/80 max-w-2xl">
            A detailed history of all your curated financial movements.
          </p>
        </div>
      </div>

      {/* Statistics Suite */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <TrendingUp className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <Badge variant="secondary" className="w-fit uppercase text-[9px] px-2 py-0 h-5 font-bold tracking-widest bg-white/20 text-white border-none">Global Ledger</Badge>
            <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-70 mt-4">Total Assets Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold font-display">
              {getCurrencySymbol(currentProfile?.currency)}{stats.totalAssets.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-low border-none shadow-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <PlusCircle className="h-16 w-16 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Monthly Inflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold font-display text-primary">
              {getCurrencySymbol(currentProfile?.currency)}{stats.inflow.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-low border-none shadow-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <MinusCircle className="h-16 w-16 text-secondary" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Monthly Burn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold font-display text-secondary">
              {getCurrencySymbol(currentProfile?.currency)}{stats.burn.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-none bg-transparent pt-4">
        <CardHeader className="px-0 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="rounded-xl px-4 py-1.5 bg-surface-low text-foreground border-none font-bold">All Movements</Badge>
            <span className="text-sm font-medium text-muted-foreground/60 cursor-pointer hover:text-foreground transition-colors">Income</span>
            <span className="text-sm font-medium text-muted-foreground/60 cursor-pointer hover:text-foreground transition-colors">Expenses</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder="Search transactions..."
                className="pl-12 h-12 bg-surface-low border-none rounded-2xl focus-visible:ring-primary/20 font-medium shadow-sm w-[280px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold border-muted-foreground/20 hover:bg-surface-low"><Search className="h-4 w-4 mr-2" /> Filter</Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table className="border-none">
            <TableHeader className="[&_tr]:border-none">
              <TableRow className="hover:bg-transparent uppercase text-[10px] tracking-[0.2em] font-bold text-muted-foreground/60">
                <TableHead className="h-12">Recipient/Sender</TableHead>
                <TableHead className="h-12 text-center">Type</TableHead>
                <TableHead className="h-12">Category</TableHead>
                <TableHead className="h-12">Payment Mode</TableHead>
                <TableHead className="h-12">Date</TableHead>
                <TableHead className="text-right h-12">Amount</TableHead>
                <TableHead className="w-[50px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-none">
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-20 font-display text-muted-foreground italic">Curating your movements...</TableCell></TableRow>}
              {!isLoading && filteredAndSortedTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="hover:bg-muted/30 transition-all duration-200 border-none group">
                  <TableCell className="py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-surface-low flex items-center justify-center text-primary">
                        <MoreHorizontal className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{transaction.recipientSender}</div>
                        <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">Professional Move</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 text-center">
                    <Badge variant="secondary" className={cn(
                      "uppercase text-[9px] px-2 py-0 h-5 font-extrabold tracking-tight rounded-full border-none",
                      transaction.type === 'income' ? 'bg-emerald-100/50 text-emerald-700' : 'bg-rose-100/50 text-rose-700'
                    )}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-slate-400" />
                       <span className="font-semibold text-muted-foreground/70">{transaction.category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <Badge variant="outline" className="rounded-md border-muted-foreground/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2 py-1 bg-surface-low">
                      {transaction.modeOfPayment}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-6 text-muted-foreground font-medium">{transaction.date}</TableCell>
                  <TableCell className={cn(
                    "text-right font-extrabold font-display text-lg py-6",
                    transaction.category === 'Debt'
                      ? (transaction.type === 'income' ? "text-destructive" : "text-primary")
                      : (transaction.type === 'income' ? "text-primary" : "text-destructive")
                  )}>
                    {transaction.type === 'income' ? '+' : '-'}{getCurrencySymbol(currentProfile?.currency)}{transaction.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl elevation-tonal">
                        <DropdownMenuLabel className="font-display">Actions</DropdownMenuLabel>
                        <DropdownMenuItem className="font-medium">Curate Details</DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 font-bold"
                          onClick={() => handleDeleteClick(transaction)}
                        >
                          Erase Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredAndSortedTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-muted-foreground font-display italic">
                    {transactionData && transactionData.length > 0 ? "No movements match your curation." : "The story begins when you add your first transaction."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-8 flex items-center justify-between px-2">
            <p className="text-sm font-medium text-muted-foreground/60 tracking-tight">Showing {filteredAndSortedTransactions.length} curated entries</p>
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest mr-2">Page Control</span>
               <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <Button key={i} variant={i === 1 ? 'default' : 'ghost'} size="sm" className="h-8 w-8 rounded-lg font-bold p-0">{i}</Button>
                  ))}
               </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
