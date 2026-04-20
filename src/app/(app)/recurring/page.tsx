"use client"

import {
  Card,
  CardContent,
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
import { PlusCircle, MoreHorizontal, Search, RefreshCw } from "lucide-react"
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
import { collection, doc, updateDoc, deleteDoc } from '@/appwrite'
import type { RecurringTransaction } from "@/lib/types"
import { getCurrencySymbol } from "@/lib/utils"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { DeleteDialog } from "@/components/delete-dialog"
import { format } from "date-fns"

export default function RecurringPage() {
  const { user } = useUser();
  const { currentProfile, isLoading: isProfileLoading } = useProfile();
  const firestore = useFirestore();

  const recurringQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/recurringTransactions`);
  }, [user, currentProfile, firestore]);

  const { data: recurringData, isLoading } = useCollection<RecurringTransaction>(recurringQuery);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recurringToDelete, setRecurringToDelete] = useState<RecurringTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeRecordsCount = useMemo(() => {
    if (!recurringData) return 0;
    return recurringData.filter(d => d.isActive).length;
  }, [recurringData]);

  const filteredAndSortedRecords = useMemo(() => {
    if (!recurringData) return [];
    
    const filtered = recurringData.filter(r => 
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by next due date ascending (closest first)
    return filtered.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  }, [recurringData, searchQuery]);

  const toggleStatus = async (record: RecurringTransaction & { id?: string }) => {
    if (!user || !currentProfile || !record.id) return;
    try {
      const docRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/recurringTransactions/${record.id}`);
      await updateDoc(docRef, {
        isActive: !record.isActive
      });
      toast({
        title: "Status Updated",
        description: `Recurring transaction is now ${!record.isActive ? 'Active' : 'Paused'}.`,
      });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update record status.", variant: "destructive" });
    }
  };

  const handleDeleteClick = (record: RecurringTransaction & { id?: string }) => {
    setRecurringToDelete(record);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!user || !currentProfile || !recurringToDelete || !(recurringToDelete as any).id) return;
    
    setIsDeleting(true);
    try {
      const docRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/recurringTransactions/${(recurringToDelete as any).id}`);
      await deleteDoc(docRef);
      toast({ title: "Success", description: "Recurring transaction deleted." });
      setDeleteDialogOpen(false);
      setRecurringToDelete(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 pb-10">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-secondary">Automation</p>
          <h2 className="text-5xl font-extrabold font-display tracking-tight text-foreground">Recurring Transactions</h2>
          <p className="text-lg font-medium text-muted-foreground/80 max-w-2xl">
            Manage your automated financial movements and recurring bills seamlessly.
          </p>
        </div>
        <Button size="lg" variant="premium" className="rounded-full px-8 h-14 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95" disabled={isProfileLoading || !currentProfile} asChild>
            <Link href="/recurring/add" className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Add Recurring
            </Link>
        </Button>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-surface-low border-none shadow-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <RefreshCw className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Active Automations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold font-display text-secondary">
               {activeRecordsCount} <span className="text-sm font-medium text-muted-foreground">running</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="rounded-xl px-4 py-1.5 bg-surface-low text-foreground border-none font-bold">All Recurring</Badge>
          </div>
          <div className="relative max-w-sm w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="search"
              placeholder="Search by description or category..."
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
                <TableHead className="h-12 w-[80px]">Status</TableHead>
                <TableHead className="h-12">Description</TableHead>
                <TableHead className="h-12">Type / Category</TableHead>
                <TableHead className="h-12">Frequency</TableHead>
                <TableHead className="text-right h-12">Amount</TableHead>
                <TableHead className="h-12 border-l border-border pl-6">Next Due</TableHead>
                <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-none">
              {isLoading && (
                <TableRow>
                   <TableCell colSpan={7} className="text-center py-20 font-display text-muted-foreground italic">Fetching automated pipelines...</TableCell>
                </TableRow>
              )}
              {!isLoading && filteredAndSortedRecords.map((record) => (
                <TableRow key={(record as any).id} className={`hover:bg-muted/30 transition-all duration-200 border-none group ${!record.isActive && 'opacity-60 grayscale'}`}>
                   <TableCell className="py-6">
                      <div className={`w-3 h-3 rounded-full shadow-sm mx-auto ${record.isActive ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-muted-foreground'}`}/>
                   </TableCell>
                   <TableCell className="py-6">
                     <span className="font-bold text-foreground block">{record.description}</span>
                   </TableCell>
                   <TableCell className="py-6">
                     <Badge variant="outline" className={`uppercase text-[9px] px-3 py-0.5 h-6 font-bold tracking-tight rounded-full ${record.type === 'income' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-primary border-primary/20 bg-primary/10'}`}>
                       {record.type} • {record.category}
                     </Badge>
                   </TableCell>
                   <TableCell className="py-6 font-semibold text-muted-foreground/70 capitalize">{record.frequency}</TableCell>
                   <TableCell className="text-right py-6 font-extrabold font-display text-lg text-foreground">
                     {getCurrencySymbol(currentProfile?.currency)}{record.amount.toLocaleString()}
                   </TableCell>
                   <TableCell className="py-6 font-medium text-muted-foreground border-l border-border/50 pl-6">
                      {format(new Date(record.nextDueDate), 'MMM dd, yyyy')}
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
                        <DropdownMenuItem className="font-medium" onClick={() => setTimeout(() => toggleStatus(record), 10)}>
                          {record.isActive ? "Pause Automation" : "Resume Automation"}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 font-bold"
                          onClick={() => setTimeout(() => handleDeleteClick(record), 10)}
                        >
                          Delete Automation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredAndSortedRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-muted-foreground font-display italic">
                    {recurringData && recurringData.length > 0 ? "No records match your search." : "No recurring automations set up yet."}
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
        title="Delete Recurring Automation"
        description={`Are you sure you want to completely erase the automation for "${recurringToDelete?.description}"?`}
      />
    </div>
  )
}
