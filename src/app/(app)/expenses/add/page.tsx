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
import { ArrowLeft, ReceiptText, CalendarIcon, Briefcase } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import { collection, serverTimestamp, addDoc, updateDoc, arrayUnion, doc } from '@/appwrite'
import { useRouter } from "next/navigation"
import Link from "next/link"

const formSchema = z.object({
  itemService: z.string().min(2, {
    message: "Item/Service must be at least 2 characters.",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be a positive number.",
  }),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  category: z.string({
    required_error: "Please select a category.",
  }),
  customCategory: z.string().optional(),
  frequency: z.enum(['one-time', 'daily', 'weekly', 'monthly', 'annually']),
  modeOfPayment: z.enum(['Credit Card', 'Bank Transfer', 'Cash', 'Debit Card', 'Cheque']),
})

export default function AddExpensePage() {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const defaultCategories = ['Groceries', 'Utilities', 'Transport', 'Entertainment', 'Health', 'Other'];
  const customCategories = currentProfile?.expenseCategories || [];
  const allCategories = [...new Set([...defaultCategories, ...customCategories])].sort();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemService: "",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: 'Other',
      customCategory: '',
      frequency: 'one-time',
      modeOfPayment: 'Cash',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    if (!currentProfile) {
      toast({
        title: "Error",
        description: "No profile selected. Please select a profile.",
        variant: "destructive",
      })
      return;
    }

    const finalCategory = values.category === 'Other' && values.customCategory
      ? values.customCategory
      : values.category;

    // Update UserProfile with new category if it's a custom one
    if (values.category === 'Other' && values.customCategory) {
      const profileRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}`);
      try {
        await updateDoc(profileRef, {
          expenseCategories: arrayUnion(values.customCategory)
        });
      } catch (e) {
        console.error("Failed to update profile categories:", e);
      }
    }

    const expensesCol = collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/expenses`);
    const expenseData = {
      ...values,
      category: finalCategory,
      profileId: currentProfile.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    try {
      const expenseDocRef = await addDoc(expensesCol, expenseData);

      if (expenseDocRef) {
        const transactionsCol = collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/transactions`);
        const transactionData = {
          profileId: currentProfile.id,
          amount: values.amount,
          date: values.date,
          type: 'expense',
          modeOfPayment: values.modeOfPayment,
          category: finalCategory,
          recipientSender: values.itemService,
          description: `Expense for ${values.itemService}`,
          expenseId: expenseDocRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        await addDoc(transactionsCol, transactionData);

        if (values.frequency !== 'one-time') {
          const recurringCol = collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/recurringTransactions`);
          
          let nextDueDate = new Date(values.date);
          if (values.frequency === 'daily') nextDueDate.setDate(nextDueDate.getDate() + 1);
          else if (values.frequency === 'weekly') nextDueDate.setDate(nextDueDate.getDate() + 7);
          else if (values.frequency === 'monthly') nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          else if (values.frequency === 'annually') nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

          const recurringData = {
            profileId: currentProfile.id,
            type: 'expense',
            amount: values.amount,
            category: finalCategory,
            description: values.itemService,
            frequency: values.frequency,
            startDate: values.date,
            nextDueDate: nextDueDate.toISOString().split('T')[0],
            isActive: true,
            linkedExpenseId: expenseDocRef.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await addDoc(recurringCol, recurringData);
        }
      }
      router.push('/expenses');
    } catch (error) {
      let path = expensesCol.path;
      let data: any = expenseData;
      if (error instanceof Error && 'message' in error && error.message.includes('transaction')) {
        path = `users/${user.uid}/userProfiles/${currentProfile.id}/transactions`;
        data = { errorInfo: 'Failed to create transaction for expense' };
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
          <Link href="/expenses">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Ledger
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h2 className="text-5xl font-extrabold font-display tracking-tight text-foreground mb-4">Log New <span className="text-primary italic">Expense</span></h2>
        <p className="text-lg font-medium text-muted-foreground/80 leading-relaxed max-w-xl">
          Curate your financial narrative by documenting your latest transaction with precision.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="grid lg:grid-cols-[1fr,400px] gap-8 items-start">
          
          {/* Left Column: Transaction Details */}
          <div className="space-y-6">
            <div className="bg-surface-low rounded-[32px] p-8 md:p-12 space-y-8">
              
              <FormField
                control={form.control}
                name="itemService"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Item / Service</FormLabel>
                    <FormControl>
                      <Input className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20 placeholder:text-muted-foreground/40" placeholder="e.g. Premium Editorial Subscription" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-6 top-4 font-bold text-muted-foreground">$</span>
                          <Input className="h-14 bg-background border-none rounded-2xl pl-10 pr-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20" type="number" step="0.01" placeholder="0.00" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Transaction Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-surface-low rounded-[32px] p-8 md:p-12 space-y-8">
              <div>
                <h3 className="text-2xl font-bold font-display text-foreground mb-1">Categorization</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Primary Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-none shadow-xl">
                          {allCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('category') === 'Other' ? (
                  <FormField
                    control={form.control}
                    name="customCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Custom Tag</FormLabel>
                        <FormControl>
                          <Input className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20 placeholder:text-muted-foreground/40" placeholder="e.g. Subscriptions" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="opacity-50 pointer-events-none">
                     <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Custom Tag (Optional)</FormLabel>
                        <div className="h-14 bg-background/50 border-none rounded-2xl px-6 text-lg font-semibold text-muted-foreground/40 flex items-center">
                          Add custom tag...
                        </div>
                      </FormItem>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Mechanics & Submit */}
          <div className="space-y-6">
            <div className="bg-surface-low rounded-[32px] p-8">
              <h3 className="text-xl font-bold font-display text-foreground mb-6">Payment Mechanics</h3>
              
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem className="mb-8">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3 block">Frequency</FormLabel>
                    <FormControl>
                       <div className="flex bg-background p-1.5 rounded-[20px] shadow-sm">
                          {['one-time', 'recurring'].map((opt) => {
                             // Handle our actual enum maps to the toggle look
                             const isSelected = field.value === opt || (opt === 'recurring' && field.value !== 'one-time');
                             return (
                               <button
                                 key={opt}
                                 type="button"
                                 onClick={() => field.onChange(opt === 'recurring' ? 'monthly' : 'one-time')}
                                 className={`flex-1 rounded-[16px] py-3 text-sm font-bold capitalize transition-all ${isSelected ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                               >
                                 {opt}
                               </button>
                             );
                          })}
                       </div>
                    </FormControl>
                    {field.value !== 'one-time' && (
                       <div className="mt-4">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 bg-background border-none rounded-xl px-4 font-semibold shadow-sm focus-visible:ring-primary/20">
                                <SelectValue placeholder="Select frequency rate" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-none shadow-xl">
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="annually">Annually</SelectItem>
                            </SelectContent>
                          </Select>
                       </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modeOfPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3 block">Payment Mode</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {['Credit Card', 'Bank Transfer', 'Debit Card', 'Cash', 'Cheque'].map((mode) => (
                          <label key={mode} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${field.value === mode ? 'bg-background shadow-sm border border-primary/20' : 'bg-transparent hover:bg-background/50 border border-transparent'}`}>
                            <input
                              type="radio"
                              value={mode}
                              checked={field.value === mode}
                              onChange={() => field.onChange(mode)}
                              className="w-4 h-4 text-primary bg-surface-low border-muted-foreground focus:ring-primary focus:ring-2"
                            />
                            <div className="flex items-center gap-2 font-semibold text-sm">
                              {mode === 'Credit Card' || mode === 'Debit Card' ? <Briefcase className="h-4 w-4 text-primary" /> : null}
                              {mode === 'Bank Transfer' ? <Briefcase className="h-4 w-4 text-primary" /> : null}
                              {mode === 'Cash' || mode === 'Cheque' ? <Briefcase className="h-4 w-4 text-primary" /> : null}
                              {mode}
                            </div>
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card className="bg-card border-none shadow-sm rounded-[32px] overflow-hidden">
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary">Summary</h3>
                  <div className="p-2 bg-surface-low rounded-xl">
                    <ReceiptText className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                </div>
                
                <div className="text-3xl font-extrabold font-display tracking-tight text-foreground mb-4">
                  ${Number(form.watch('amount') || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                
                <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed mb-6">
                  Review your entry before curation.
                </p>

                <div className="space-y-4">
                   <Button type="submit" disabled={form.formState.isSubmitting} className="w-full h-16 rounded-[24px] font-bold text-lg shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all">
                     {form.formState.isSubmitting ? "Saving..." : "Archive Transaction"}
                   </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        </form>
      </Form>
    </div>
  )
}
