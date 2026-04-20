"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Target, Wallet, AlertTriangle, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useProfile } from "@/context/ProfileContext"
import { useBudgetProgress } from "@/hooks/use-budget-progress"
import { getCurrencySymbol } from "@/lib/utils"
import Link from "next/link"
import { useMemo, useState } from "react"
import { doc, deleteDoc } from '@/appwrite'
import { useUser, useFirestore } from "@/appwrite"
import { useToast } from "@/hooks/use-toast"
import { DeleteDialog } from "@/components/delete-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

export default function BudgetsPage() {
  const { currentProfile, isLoading: isProfileLoading } = useProfile();
  const { budgets, isLoading } = useBudgetProgress();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const stats = useMemo(() => {
    if (!budgets || budgets.length === 0) return { totalLimit: 0, totalSpent: 0, safe: 0, warning: 0, danger: 0 };
    
    return budgets.reduce((acc, b) => {
      acc.totalLimit += b.limitAmount;
      acc.totalSpent += b.spent;
      if (b.status === 'safe') acc.safe++;
      if (b.status === 'warning') acc.warning++;
      if (b.status === 'danger') acc.danger++;
      return acc;
    }, { totalLimit: 0, totalSpent: 0, safe: 0, warning: 0, danger: 0 });
  }, [budgets]);

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'danger': return 'bg-destructive shadow-destructive/50';
      case 'warning': return 'bg-amber-500 shadow-amber-500/50';
      case 'safe':
      default: return 'bg-emerald-500 shadow-emerald-500/50';
    }
  }

  const handleDeleteClick = (budget: any) => {
    setBudgetToDelete(budget);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!user || !currentProfile || !budgetToDelete || !budgetToDelete.id) return;
    
    setIsDeleting(true);
    try {
      const budgetRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/budgets/${budgetToDelete.id}`);
      await deleteDoc(budgetRef);
      toast({
        title: "Success",
        description: "Budget deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setBudgetToDelete(null);
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast({
        title: "Error",
        description: "Failed to delete budget.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 pb-10">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-secondary">Control Center</p>
          <h2 className="text-5xl font-extrabold font-display tracking-tight text-foreground">Active Budgets</h2>
          <p className="text-lg font-medium text-muted-foreground/80 max-w-2xl">
            Monitor your category allocations and keep your expenditure on track.
          </p>
        </div>
        <Button size="lg" className="rounded-xl px-6 font-semibold h-11 shadow-md shadow-primary/20" disabled={isProfileLoading || !currentProfile} asChild>
            <Link href="/budgets/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Configure Budget
            </Link>
        </Button>
      </div>

      {/* Aggregate Stats */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-surface-low border-none shadow-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Total Budgeted Allowances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold font-display text-secondary">
              {getCurrencySymbol(currentProfile?.currency)}{stats.totalLimit.toLocaleString()}
            </div>
            <div className="text-sm font-semibold text-muted-foreground mt-1">
               {getCurrencySymbol(currentProfile?.currency)}{stats.totalSpent.toLocaleString()} spent across all tracked rules
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-low border-none shadow-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-destructive">
            <AlertTriangle className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mt-2">
               <div className="text-center">
                 <div className="text-2xl font-bold font-display text-emerald-500">{stats.safe}</div>
                 <div className="text-[10px] font-bold uppercase text-muted-foreground">Safe</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold font-display text-amber-500">{stats.warning}</div>
                 <div className="text-[10px] font-bold uppercase text-muted-foreground">Warning</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold font-display text-destructive">{stats.danger}</div>
                 <div className="text-[10px] font-bold uppercase text-muted-foreground">Danger</div>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
         <div className="flex items-center justify-between mb-6">
           <Badge variant="secondary" className="rounded-xl px-4 py-1.5 bg-surface-low text-foreground border-none font-bold">Category Budgets</Badge>
         </div>

         {isLoading ? (
             <div className="text-center py-20 font-display text-muted-foreground italic bg-surface-low rounded-3xl">
               Calibrating dynamic budget algorithms...
             </div>
         ) : budgets.length === 0 ? (
             <div className="text-center py-20 bg-surface-low rounded-3xl border border-dashed border-border/50">
                <Target className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-xl font-bold font-display text-foreground mb-2">No Budgets Defined</h3>
                <p className="text-muted-foreground mb-6">You haven't set any financial limits for your categories.</p>
                <Button variant="outline" asChild>
                   <Link href="/budgets/add">Set your first limit</Link>
                </Button>
             </div>
         ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {budgets.map((budget: any) => (
                <Card key={budget.id} className="border border-border/50 bg-background shadow-sm hover:shadow-md transition-all rounded-[24px]">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                     <div>
                       <Badge variant="outline" className="uppercase text-[9px] px-3 py-0.5 h-6 font-bold tracking-tight rounded-full bg-primary/10 text-primary border-none mb-2 block w-max">
                         {budget.period}
                       </Badge>
                       <CardTitle className="text-xl font-extrabold font-display">{budget.category}</CardTitle>
                     </div>
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button aria-haspopup="true" size="icon" variant="ghost" className="rounded-full h-8 w-8 hover:bg-surface-low">
                           <MoreHorizontal className="h-4 w-4" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl">
                         <DropdownMenuItem onClick={() => handleDeleteClick(budget)} className="text-destructive font-bold cursor-pointer">
                           Delete Rule
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                     <div className="flex justify-between items-end mb-2">
                        <div>
                          <span className="text-2xl font-bold">
                            {getCurrencySymbol(currentProfile?.currency)}{budget.spent.toLocaleString()}
                          </span>
                          <span className="text-sm font-medium text-muted-foreground ml-1">
                            / {budget.limitAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className={`text-sm font-bold ${budget.status === 'danger' ? 'text-destructive' : budget.status === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`}>
                           {budget.percentage}%
                        </div>
                     </div>
                     <div className="w-full bg-muted rounded-full h-3 mb-4 overflow-hidden relative">
                       <div 
                         className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${getProgressColor(budget.status)}`} 
                         style={{ width: `${budget.percentage}%` }}
                       />
                     </div>
                     <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                        <span>{getCurrencySymbol(currentProfile?.currency)}{budget.remaining.toLocaleString()} left</span>
                        <span>Threshold: {budget.alertThreshold}%</span>
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
         )}
      </div>

      <DeleteDialog 
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title="Delete Budget Rule"
        description={`Are you sure you want to remove the budget rule for ${budgetToDelete?.category}?`}
      />
    </div>
  )
}
