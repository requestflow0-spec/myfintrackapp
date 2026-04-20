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
import type { Income } from "@/lib/types"
import { getCurrencySymbol } from "@/lib/utils"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { DeleteDialog } from "@/components/delete-dialog"
import { EditIncomeDialog } from "@/components/edit-income-dialog"
import { useToast } from "@/hooks/use-toast"
import { doc, deleteDoc } from '@/appwrite'

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

  const stats = useMemo(() => {
    if (!incomeData) return { totalIncome: 0, activeSourcesCount: 0 };
    const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
    const activeSourcesCount = new Set(incomeData.map(i => i.source)).size;
    return { totalIncome, activeSourcesCount };
  }, [incomeData]);

  const incomeTrend = useMemo(() => {
    if (!incomeData || incomeData.length === 0) return null;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let thisMonthTotal = 0;
    let lastMonthTotal = 0;

    incomeData.forEach(income => {
      const incomeDate = new Date(income.date);
      if (incomeDate.getFullYear() === currentYear && incomeDate.getMonth() === currentMonth) {
        thisMonthTotal += income.amount;
      } else if (
        (currentMonth === 0 && incomeDate.getFullYear() === currentYear - 1 && incomeDate.getMonth() === 11) ||
        (currentMonth > 0 && incomeDate.getFullYear() === currentYear && incomeDate.getMonth() === currentMonth - 1)
      ) {
        lastMonthTotal += income.amount;
      }
    });

    if (lastMonthTotal === 0) {
      if (thisMonthTotal > 0) return { percentage: "+100", isPositive: true };
      return null;
    }

    const percentageChange = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
    return {
      percentage: (percentageChange > 0 ? "+" : "") + percentageChange.toFixed(1),
      isPositive: percentageChange >= 0
    };
  }, [incomeData]);

  const filteredAndSortedIncome = useMemo(() => {
    if (!incomeData) return [];
    
    // Filter
    const filtered = incomeData.filter(i => 
      i.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.client && i.client.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Sort by date descending (newest first)
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
    <div className="flex-1 space-y-8 pb-10">
      {/* Editorial Header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary">Financial Editorial</p>
          <h2 className="text-5xl font-extrabold font-display tracking-tight text-foreground">Manage your income sources</h2>
          <p className="text-lg font-medium text-muted-foreground/80 max-w-2xl">
            Track, curate, and optimize your high-yield revenue streams with precision editorial insights.
          </p>
        </div>
        <Button size="lg" className="rounded-full px-8 h-14 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95" disabled={isProfileLoading || !currentProfile} asChild>
            <Link href="/income/add" className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Add Income
            </Link>
        </Button>
      </div>

      {/* Statistics Suite */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-surface-low border-none shadow-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <MoreHorizontal className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Monthly Projected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold font-display text-primary">
              {getCurrencySymbol(currentProfile?.currency)}{stats.totalIncome.toLocaleString()}
            </div>
            {incomeTrend && (
              <div className={`flex items-center gap-1 mt-2 font-bold text-sm ${incomeTrend.isPositive ? 'text-primary' : 'text-destructive'}`}>
                <span className={`flex items-center justify-center p-0.5 rounded-full mr-1 ${incomeTrend.isPositive ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                  {incomeTrend.isPositive ? <PlusCircle className="h-3 w-3" /> : <div className="h-3 w-3 flex items-center justify-center">-</div>}
                </span>
                {incomeTrend.percentage}% from last period
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface-low border-none shadow-none overflow-hidden relative group">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Active Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold font-display text-foreground">
              {stats.activeSourcesCount}
            </div>
            <div className="flex items-center gap-1 mt-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-6 w-6 rounded-full border-2 border-surface-low bg-primary/20 flex items-center justify-center text-[8px] font-bold">SM</div>
                ))}
                <div className="h-6 w-6 rounded-full border-2 border-surface-low bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">+{Math.max(0, stats.activeSourcesCount - 3)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="font-display text-2xl font-bold">Revenue Ledger</CardTitle>
          <div className="relative max-w-sm w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="search"
              placeholder="Search income sources..."
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
                <TableHead className="h-12">Source</TableHead>
                <TableHead className="h-12">Client</TableHead>
                <TableHead className="text-right h-12">Amount</TableHead>
                <TableHead className="h-12">Date</TableHead>
                <TableHead className="h-12 text-center">Status</TableHead>
                <TableHead className="w-[50px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-none">
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 font-display text-muted-foreground italic">Curating your revenue data...</TableCell>
                </TableRow>
              )}
              {!isLoading && filteredAndSortedIncome.map((income) => (
                <TableRow key={income.id} className="hover:bg-muted/30 transition-all duration-200 border-none group">
                  <TableCell className="py-6">
                    <div className="font-bold text-foreground">{income.source}</div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 mt-0.5">{income.description || 'Income Stream'}</div>
                  </TableCell>
                  <TableCell className="py-6">
                    {income.client ? (
                      <span className="font-semibold text-muted-foreground">{income.client}</span>
                    ) : (
                      <span className="text-muted-foreground/40 font-medium italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-6 font-extrabold font-display text-lg text-primary">
                    {getCurrencySymbol(currentProfile?.currency)}{income.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-6 font-medium text-muted-foreground">{income.date}</TableCell>
                  <TableCell className="py-6 text-center">
                    <Badge variant="secondary" className="uppercase text-[9px] px-2 py-0 h-5 font-bold tracking-tight rounded-full bg-emerald-100/50 text-emerald-700 hover:bg-emerald-100/80 border-none">
                      {new Date(income.date) > new Date() ? 'Pending' : 'Cleared'}
                    </Badge>
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
                        <DropdownMenuItem className="font-medium" onClick={() => setTimeout(() => handleEditClick(income), 10)}>
                          Edit Ledger Entry
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 font-bold"
                          onClick={() => setTimeout(() => handleDeleteClick(income), 10)}
                        >
                          Delete Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
               {!isLoading && filteredAndSortedIncome.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-muted-foreground font-display italic">
                    {incomeData && incomeData.length > 0 ? "No records match your curation." : "The story begins when you add your first revenue stream."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    </div>
  );
}
