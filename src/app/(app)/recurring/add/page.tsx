"use client"

import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, Briefcase } from "lucide-react"
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
  description: z.string().min(2, { message: "Description must be at least 2 characters." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  type: z.enum(['expense', 'income']),
  category: z.string({ required_error: "Please select a category." }),
  customCategory: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'annually']),
})

export default function AddRecurringPage() {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const defaultExpenseCategories = ['Groceries', 'Utilities', 'Transport', 'Entertainment', 'Health', 'Other'];
  const defaultIncomeCategories = ['Salary', 'Business', 'Investments', 'Other'];
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: 0,
      startDate: new Date().toISOString().split('T')[0],
      type: 'expense',
      category: 'Utilities',
      customCategory: '',
      frequency: 'monthly',
    },
  })

  // Determine current category list based on type
  const isExpense = form.watch('type') === 'expense';
  const customCategories = currentProfile?.expenseCategories || [];
  const allCategories = isExpense 
     ? [...new Set([...defaultExpenseCategories, ...customCategories])].sort()
     : [...new Set([...defaultIncomeCategories, ...customCategories])].sort();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !currentProfile) return;

    const finalCategory = values.category === 'Other' && values.customCategory
      ? values.customCategory
      : values.category;

    if (values.category === 'Other' && values.customCategory && isExpense) {
      const profileRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}`);
      try {
        await updateDoc(profileRef, { expenseCategories: arrayUnion(values.customCategory) });
      } catch (e) {
        console.error("Failed to update profile categories");
      }
    }

    const recurringCol = collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/recurringTransactions`);
    const data = {
      profileId: currentProfile.id,
      type: values.type,
      amount: values.amount,
      category: finalCategory,
      description: values.description,
      frequency: values.frequency,
      startDate: new Date(values.startDate).toISOString(),
      nextDueDate: new Date(values.startDate).toISOString(), // next is now if same day
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    try {
      await addDoc(recurringCol, data);
      toast({ title: "Automation Created", description: "Recurring transaction initialized successfully."});
      router.push('/recurring');
    } catch (error) {
       errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: recurringCol.path,
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
          <Link href="/recurring"><ArrowLeft className="h-4 w-4 mr-1" />Back to Automations</Link>
        </Button>
      </div>

      <div className="mb-8">
        <h2 className="text-5xl font-extrabold font-display tracking-tight text-foreground mb-4">New <span className="text-primary italic">Automation</span></h2>
        <p className="text-lg font-medium text-muted-foreground/80 leading-relaxed max-w-xl">
          Set up a robust recurring pipeline to automate identical future transactions.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="grid lg:grid-cols-[1fr,400px] gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-surface-low rounded-[32px] p-8 md:p-12 space-y-8">
              
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Transaction Type</FormLabel>
                      <div className="flex bg-background p-1.5 rounded-[20px] shadow-sm">
                          {['expense', 'income'].map((opt) => (
                             <button
                               key={opt} type="button" onClick={() => field.onChange(opt)}
                               className={`flex-1 rounded-[16px] py-3 text-sm font-bold capitalize transition-all ${field.value === opt ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                             >{opt}</button>
                          ))}
                       </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Description/Label</FormLabel>
                      <FormControl><Input className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20" placeholder="e.g. Netflix Subscription" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">First Execution Date</FormLabel>
                      <FormControl><Input type="date" className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-surface-low rounded-[32px] p-8 md:p-12 space-y-8">
              <h3 className="text-2xl font-bold font-display text-foreground mb-1">Categorization</h3>
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
                          {allCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
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
                        <FormControl><Input className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm" placeholder="e.g. Subscriptions" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="opacity-50 pointer-events-none">
                     <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Custom Tag (Optional)</FormLabel>
                        <div className="h-14 bg-background/50 border-none rounded-2xl px-6 text-lg font-semibold flex items-center">Add custom tag...</div>
                      </FormItem>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-surface-low rounded-[32px] p-8">
              <h3 className="text-xl font-bold font-display text-foreground mb-6">Automation Timing</h3>
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3 block">Recurrence Rate</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card className="bg-card border-none shadow-sm rounded-[32px] overflow-hidden">
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary">Pipeline Summary</h3>
                  <div className="p-2 bg-surface-low rounded-xl">
                    <RefreshCw className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                </div>
                
                <div className="text-3xl font-extrabold font-display tracking-tight text-foreground mb-4">
                  ${Number(form.watch('amount') || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-muted-foreground">/ {form.watch('frequency')}</span>
                </div>
                
                <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed mb-6">
                  This transaction will automatically mirror into your ledger starting {form.watch('startDate') || 'today'}.
                </p>

                <div className="space-y-4">
                   <Button type="submit" disabled={form.formState.isSubmitting} className="w-full h-16 rounded-[24px] font-bold text-lg shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all">
                     {form.formState.isSubmitting ? "Initializing..." : "Initialize Pipeline"}
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
