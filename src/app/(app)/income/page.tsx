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
import type { Income } from "@/lib/types"
import { getCurrencySymbol } from "@/lib/utils"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { DeleteDialog } from "@/components/delete-dialog"
import { EditIncomeDialog } from "@/components/edit-income-dialog"
import { useToast } from "@/hooks/use-toast"
import { doc, deleteDoc } from "firebase/firestore"

export default function IncomePage() {
  const { user } = useUser();
  const { currentProfile, isLoading: isProfileLoading } = useProfile();
  const firestore = useFirestore();

  const incomesQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/incomes`);
  }, [user, currentProfile, firestore]);

  const { data: incomeData, isLoading } = useCollection<Income>(incomesQuery);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [incomeToEdit, setIncomeToEdit] = useState<Income & { id: string } | null>(null);

  const filteredAndSortedIncome = useMemo(() => {
    if (!incomeData) return [];
    
    // Filter
    const filtered = incomeData.filter(i => 
      i.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.client && i.client.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Sort by date descending (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomeData, searchQuery]);

  const handleDeleteClick = (income: Income & { id?: string }) => {
    setIncomeToDelete(income);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (income: Income & { id?: string }) => {
    if ((income as any).id) {
       setIncomeToEdit(income as Income & { id: string });
       setEditDialogOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!user || !currentProfile || !incomeToDelete || !(incomeToDelete as any).id) return;
    
    setIsDeleting(true);
    try {
      const incomeRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/incomes/${(incomeToDelete as any).id}`);
      await deleteDoc(incomeRef);
      toast({
        title: "Success",
        description: "Income record deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setIncomeToDelete(null);
    } catch (error) {
      console.error("Error deleting income:", error);
      toast({
        title: "Error",
        description: "Failed to delete income record.",
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
            <CardTitle>Income</CardTitle>
            <CardDescription>Manage your income sources.</CardDescription>
          </div>
          <Button size="sm" className="gap-1" disabled={isProfileLoading || !currentProfile} asChild>
              <Link href="/income/add">
                <PlusCircle className="h-4 w-4" />
                Add Income
              </Link>
          </Button>
        </div>
        <div className="mt-4 relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search income sources..."
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
              <TableHead>Source</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && filteredAndSortedIncome.map((income) => (
              <TableRow key={income.id}>
                <TableCell className="font-medium">{income.source}</TableCell>
                <TableCell>
                  {income.client ? <Badge variant="outline">{income.client}</Badge> : '-'}
                </TableCell>
                <TableCell className="text-right">{getCurrencySymbol(currentProfile?.currency)}{income.amount.toLocaleString()}</TableCell>
                <TableCell>{income.date}</TableCell>
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
                      <DropdownMenuItem onClick={() => setTimeout(() => handleEditClick(income), 10)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setTimeout(() => handleDeleteClick(income), 10)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
             {!isLoading && filteredAndSortedIncome.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  {incomeData && incomeData.length > 0 ? "No income records found matching your search." : "No income records found."}
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
        title="Delete Income"
        description={`Are you sure you want to delete the income record for ${incomeToDelete?.source}?`}
      />

      <EditIncomeDialog 
         open={editDialogOpen} 
         onOpenChange={setEditDialogOpen} 
         income={incomeToEdit} 
      />
    </Card>
  )
}
