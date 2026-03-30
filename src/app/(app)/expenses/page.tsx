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
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { useProfile } from "@/context/ProfileContext"
import { collection } from "firebase/firestore"
import type { Expense } from "@/lib/types"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { DeleteDialog } from "@/components/delete-dialog"
import { EditExpenseDialog } from "@/components/edit-expense-dialog"
import { useToast } from "@/hooks/use-toast"
import { doc, deleteDoc } from "firebase/firestore"


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

  const filteredAndSortedExpenses = useMemo(() => {
    if (!expenseData) return [];
    
    // Filter
    const filtered = expenseData.filter(e => 
      e.itemService.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by date descending (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>Track and manage your expenses.</CardDescription>
          </div>
          <Button size="sm" className="gap-1" disabled={isProfileLoading || !currentProfile} asChild>
            <Link href="/expenses/add">
                <PlusCircle className="h-4 w-4" />
                Add Expense
            </Link>
          </Button>
        </div>
        <div className="mt-4 relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search expenses..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item/Service</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>}
            {!isLoading && filteredAndSortedExpenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">{expense.itemService}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{expense.category}</Badge>
                </TableCell>
                <TableCell className="capitalize">{expense.frequency}</TableCell>
                <TableCell className="text-right">${expense.amount.toLocaleString()}</TableCell>
                <TableCell>{expense.date}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setTimeout(() => handleEditClick(expense), 10)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setTimeout(() => handleDeleteClick(expense), 10)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && filteredAndSortedExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  {expenseData && expenseData.length > 0 ? "No expenses found matching your search." : "No expense records found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

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
    </Card>
  )
}
