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
import { Button } from "@/components/ui/button"
import { PlusCircle, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import { collection } from '@/appwrite'
import type { Expense } from "@/lib/types"
import { getCurrencySymbol } from "@/lib/utils"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { DeleteDialog } from "@/components/delete-dialog"
import { EditExpenseDialog } from "@/components/edit-expense-dialog"
import { useToast } from "@/hooks/use-toast"
import { doc, deleteDoc } from '@/appwrite'


import { MinusCircle } from "lucide-react"

export default function ExpensesPage() {
  const { user } = useUser();
  const { currentProfile, isLoading: isProfileLoading } = useProfile();
  const firestore = useFirestore();

  const expensesQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/expenses`);
  }, [user, currentProfile, firestore]);

  const { data: expenseData, isLoading } = useCollection<Expense>(expensesQuery);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense & { id: string } | null>(null);
  const stats = useMemo(() => {
    if (!expenseData) return { totalExpenses: 0 };
    const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0);
    return { totalExpenses };
  }, [expenseData]);

  const filteredAndSortedExpenses = useMemo(() => {
    if (!expenseData) return [];
    
    // Filter
    const filtered = expenseData.filter(e => 
      e.itemService.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by date descending (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenseData, searchQuery]);

  const handleDeleteClick = (expense: Expense & { id?: string }) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (expense: Expense & { id?: string }) => {
    if ((expense as any).id) {
       setExpenseToEdit(expense as Expense & { id: string });
       setEditDialogOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!user || !currentProfile || !expenseToDelete || !(expenseToDelete as any).id) return;
    
    setIsDeleting(true);
    try {
      const expenseRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/expenses/${(expenseToDelete as any).id}`);
      await deleteDoc(expenseRef);
      toast({
        title: "Success",
        description: "Expense record deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Error",
        description: "Failed to delete expense record.",
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
          <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-secondary">Financial Editorial</p>
          <h2 className="text-5xl font-extrabold font-display tracking-tight text-foreground">Track and manage your expenses</h2>
          <p className="text-lg font-medium text-muted-foreground/80 max-w-2xl">
            Analyzing your monthly distribution for better wealth retention.
          </p>
        </div>
        <Button size="lg" className="rounded-xl px-6 font-semibold h-11 shadow-md shadow-primary/20" disabled={isProfileLoading || !currentProfile} asChild>
            <Link href="/expenses/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Expense
            </Link>
        </Button>
      </div>

      {/* Statistics Suite */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-surface-low border-none shadow-none overflow-hidden relative group col-span-1 md:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <MoreHorizontal className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold font-display text-secondary">
              {getCurrencySymbol(currentProfile?.currency)}{stats.totalExpenses.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-2 text-secondary font-bold text-sm">
              <span className="flex items-center justify-center p-0.5 rounded-full bg-secondary/10 mr-1">
                <MinusCircle className="h-3 w-3" />
              </span>
              -12% vs last month
            </div>
            <div className="mt-8 space-y-2">
              <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-muted">
                <div className="bg-blue-500 w-[40%]" />
                <div className="bg-purple-500 w-[25%]" />
                <div className="bg-emerald-500 w-[35%]" />
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Housing</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500" /> Leisure</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Investing</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="rounded-xl px-4 py-1.5 bg-surface-low text-foreground border-none font-bold">All Expenses</Badge>
            <span className="text-sm font-medium text-muted-foreground/60 cursor-pointer hover:text-foreground transition-colors">Fixed</span>
            <span className="text-sm font-medium text-muted-foreground/60 cursor-pointer hover:text-foreground transition-colors">Variable</span>
          </div>
          <div className="relative max-w-sm w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="search"
              placeholder="Filter by item, category or date..."
              className="pl-12 h-12 bg-surface-low border-none rounded-2xl focus-visible:ring-primary/20 font-medium shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table className="border-none">
            <TableHeader className="[&_tr]:border-none">
              <TableRow className="hover:bg-transparent uppercase text-[10px] tracking-[0.2em] font-bold text-muted-foreground/60">
                <TableHead className="h-12">Item / Service</TableHead>
                <TableHead className="h-12">Category</TableHead>
                <TableHead className="h-12">Frequency</TableHead>
                <TableHead className="text-right h-12">Amount</TableHead>
                <TableHead className="h-12">Date</TableHead>
                <TableHead className="w-[50px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-none">
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 font-display text-muted-foreground italic">Curating your expense data...</TableCell>
                </TableRow>
              )}
              {!isLoading && filteredAndSortedExpenses.map((expense) => (
                <TableRow key={expense.id} className="hover:bg-muted/30 transition-all duration-200 border-none group">
                  <TableCell className="py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-surface-low flex items-center justify-center text-secondary">
                        <MoreHorizontal className="h-5 w-5" />
                      </div>
                      <div className="font-bold text-foreground">{expense.itemService}</div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <Badge variant="secondary" className="uppercase text-[9px] px-3 py-0.5 h-6 font-bold tracking-tight rounded-full bg-primary/10 text-primary border-none">
                      {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-6 font-semibold text-muted-foreground/70 capitalize">{expense.frequency}</TableCell>
                  <TableCell className="text-right py-6 font-extrabold font-display text-lg text-foreground">
                    {getCurrencySymbol(currentProfile?.currency)}{expense.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-6 font-medium text-muted-foreground">{expense.date}</TableCell>
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
                        <DropdownMenuItem className="font-medium" onClick={() => setTimeout(() => handleEditClick(expense), 10)}>
                          Edit Expense Entry
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 font-bold"
                          onClick={() => setTimeout(() => handleDeleteClick(expense), 10)}
                        >
                          Delete Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
               {!isLoading && filteredAndSortedExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-muted-foreground font-display italic">
                    {expenseData && expenseData.length > 0 ? "No records match your curation." : "The story begins when you add your first expense."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-8 flex items-center justify-between px-2">
            <p className="text-sm font-medium text-muted-foreground/60">Showing {filteredAndSortedExpenses.length} records</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-surface-low" disabled><MoreHorizontal className="h-4 w-4 rotate-180" /></Button>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-surface-low" disabled><MoreHorizontal className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeleteDialog 
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title="Delete Expense"
        description={`Are you sure you want to delete the expense record for ${expenseToDelete?.itemService}?`}
      />

      <EditExpenseDialog 
         open={editDialogOpen} 
         onOpenChange={setEditDialogOpen} 
         expense={expenseToEdit} 
      />
    </div>
  );
}
