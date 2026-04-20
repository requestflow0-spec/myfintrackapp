"use client"

import { useToast } from "@/hooks/use-toast"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Briefcase, Info } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import { collection, serverTimestamp, addDoc } from '@/appwrite'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  source: z.string().min(2, {
    message: "Source must be at least 2 characters.",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be a positive number.",
  }),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  client: z.string().optional(),
  modeOfPayment: z.enum(['Credit Card', 'Bank Transfer', 'Cash', 'Debit Card', 'Cheque']),
})

export default function AddIncomePage() {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: "",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      client: "",
      modeOfPayment: "Cash",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Submitting income form...", values);
    if (!user) {
      console.error("User is not logged in/defined");
      return;
    }
    if (!currentProfile) {
      console.error("No current profile selected");
      toast({
        title: "Error",
        description: "No profile selected. Please select a profile.",
        variant: "destructive",
      })
      return;
    }
    console.log("User UID:", user.uid);
    console.log("Current Profile ID:", currentProfile.id);

    const incomesCol = collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/incomes`);
    const incomeData = {
      source: values.source,
      amount: values.amount,
      date: values.date,
      client: values.client,
      profileId: currentProfile.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    try {
      const incomeDocRef = await addDoc(incomesCol, incomeData);

      if (incomeDocRef) {
        const transactionsCol = collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/transactions`);
        const transactionData = {
          profileId: currentProfile.id,
          amount: values.amount,
          date: values.date,
          type: 'income',
          modeOfPayment: values.modeOfPayment,
          category: values.source,
          recipientSender: values.client || values.source,
          description: `Income from ${values.source}`,
          incomeId: incomeDocRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        await addDoc(transactionsCol, transactionData);
      }
      router.push('/income');
    } catch (error) {
      console.error("FIREBASE ERROR:", error);
      let path = incomesCol.path;
      let data: any = incomeData;
      if (error instanceof Error && 'message' in error && error.message.includes('transaction')) {
        path = `users/${user.uid}/userProfiles/${currentProfile.id}/transactions`;
        data = { errorInfo: 'Failed to create transaction for income' };
      }
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: path,
          operation: 'create',
          requestResourceData: data,
        })
      );
    }
  }

  const onError = (errors: any) => {
    console.log("Validation Errors:", errors);
    toast({
      title: "Validation Error",
      description: "Please check the form for invalid or missing fields.",
      variant: "destructive",
    });
  };

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full pb-12">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-primary -ml-3">
          <Link href="/income">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Income
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <div className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-3 flex items-center gap-2">
          New Entry
        </div>
        <h2 className="text-5xl font-extrabold font-display tracking-tight text-foreground mb-4">Record Revenue</h2>
        <p className="text-lg font-medium text-muted-foreground/80 leading-relaxed max-w-xl">
          Document your growth. Every entry builds the narrative of your financial journey.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="grid lg:grid-cols-[1fr,380px] gap-8 items-start">
          
          {/* Left Column: Transaction Details */}
          <div className="space-y-6">
            <div className="bg-surface-low rounded-[32px] p-8 space-y-8">
              <h3 className="text-xs font-bold tracking-widest uppercase text-primary">Transaction Details</h3>
              
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Source of Income</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20 placeholder:text-muted-foreground/40" placeholder="e.g. Monthly Salary, Freelance Project" {...field} />
                        <Briefcase className="absolute right-5 top-4 h-5 w-5 text-muted-foreground/30" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Received Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="modeOfPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Mode of Payment</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-none shadow-xl">
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Debit Card">Debit Card</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Client / Entity (Optional)</FormLabel>
                    <FormControl>
                      <Input className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20 placeholder:text-muted-foreground/40" placeholder="Who made the payment?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Right Column: Amount & Submit */}
          <div className="space-y-6">
            <div className="bg-primary text-primary-foreground rounded-[32px] p-8 shadow-xl shadow-primary/20">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70 mb-2 block">Total Amount</FormLabel>
                    <FormControl>
                      <div className="relative mt-2">
                        <span className="absolute left-6 top-3 text-3xl font-bold opacity-60">$</span>
                        <Input 
                           type="number" 
                           step="0.01" 
                           className="h-20 bg-transparent border-none rounded-none px-12 text-5xl font-extrabold focus-visible:ring-0 placeholder:text-primary-foreground/30 text-primary-foreground shadow-none pl-14" 
                           placeholder="0.00" 
                           {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-primary-foreground/80 font-medium" />
                  </FormItem>
                )}
              />
              
              <div className="mt-8 pt-6 border-t border-primary-foreground/10 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70">Curation Complete?</span>
              </div>
            </div>

            <Card className="bg-card border-none shadow-sm rounded-[32px] overflow-hidden">
              <CardContent className="p-8">
                <h3 className="text-sm font-bold font-display mb-3 text-foreground">Editorial Insight</h3>
                <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed mb-6">
                  Salaries are typically deposited on the last business day. Freelance income is tracked against open invoices in your Portfolio tab.
                </p>
                <div className="flex items-start gap-3 bg-primary/5 p-4 rounded-xl text-primary font-medium text-xs">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>Entries are locked for primary edits after 30 days to maintain ledger integrity.</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4 pt-4 relative">
               <Button type="submit" disabled={form.formState.isSubmitting} className="w-full h-16 rounded-[24px] font-bold text-lg shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all">
                 {form.formState.isSubmitting ? "Saving..." : "Confirm Entry"}
               </Button>
               <Button variant="ghost" asChild className="w-full text-foreground hover:bg-surface-low rounded-xl font-bold h-12">
                 <Link href="/income">Discard Changes</Link>
               </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
