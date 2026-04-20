"use client"

import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, Target } from "lucide-react"
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
import { Slider } from "@/components/ui/slider"
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import { collection, serverTimestamp, addDoc } from '@/appwrite'
import { useRouter } from "next/navigation"
import Link from "next/link"

const formSchema = z.object({
  category: z.string({ required_error: "Please select a category to budget." }),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  limitAmount: z.coerce.number().positive({ message: "Limit must be a positive number." }),
  alertThreshold: z.number().min(50).max(100),
})

export default function AddBudgetPage() {
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
      category: 'Groceries',
      period: 'monthly',
      limitAmount: 500,
      alertThreshold: 80,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !currentProfile) return;

    const budgetsCol = collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/budgets`);
    const data = {
      profileId: currentProfile.id,
      category: values.category,
      period: values.period,
      limitAmount: values.limitAmount,
      alertThreshold: values.alertThreshold,
      currency: currentProfile.currency || 'USD',
      createdAt: serverTimestamp(),
    }

    try {
      await addDoc(budgetsCol, data);
      toast({ title: "Budget Enforced", description: "Your category limits are now actively monitored."});
      router.push('/budgets');
    } catch (error) {
       errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
           path: budgetsCol.path,
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
    <div className="flex-1 space-y-8 max-w-5xl mx-auto w-full pb-12">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-primary -ml-3">
          <Link href="/budgets"><ArrowLeft className="h-4 w-4 mr-1" />Back to Control Center</Link>
        </Button>
      </div>

      <div className="mb-8">
        <h2 className="text-5xl font-extrabold font-display tracking-tight text-foreground mb-4">Set <span className="text-primary italic">Boundary</span></h2>
        <p className="text-lg font-medium text-muted-foreground/80 leading-relaxed max-w-xl">
          Establish financial barriers to automatically monitor category spending.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="grid lg:grid-cols-[1fr,350px] gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-surface-low rounded-[32px] p-8 md:p-12 space-y-8">
              <h3 className="text-2xl font-bold font-display text-foreground mb-1">Configuration</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Tracked Category</FormLabel>
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

                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Evaluation Period</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20">
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-none shadow-xl">
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="limitAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Hard Limit Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-6 top-4 font-bold text-muted-foreground">$</span>
                        <Input className="h-14 bg-background border-none rounded-2xl pl-10 pr-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20" type="number" step="0.01" placeholder="0.00" {...field} />
                      </div>
                    </FormControl>
                     <p className="text-xs text-muted-foreground font-medium mt-2">Maximum expense allowance for this period.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alertThreshold"
                render={({ field }) => (
                  <FormItem className="pt-4">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-6 block flex justify-between">
                      <span>Warning Threshold</span>
                      <span className="text-amber-500">{field.value}%</span>
                    </FormLabel>
                    <FormControl>
                      <div className="px-2">
                        <Slider
                          min={50}
                          max={100}
                          step={5}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="w-full"
                        />
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground font-medium mt-4">At what percentage spent should we switch to warning status.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-6">
            <Card className="bg-card border-none shadow-sm rounded-[32px] overflow-hidden">
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary">Budget Integrity</h3>
                  <div className="p-2 bg-surface-low rounded-xl">
                    <Target className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                </div>
                
                <div className="text-3xl font-extrabold font-display tracking-tight text-foreground mb-4">
                  ${Number(form.watch('limitAmount') || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-muted-foreground">/ {form.watch('period').replace('ly', '')}</span>
                </div>
                
                <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed mb-6">
                  This rule will constantly cross-reference all <strong>{form.watch('category')}</strong> expenses to enforce your limits.
                </p>

                <div className="space-y-4">
                   <Button type="submit" disabled={form.formState.isSubmitting} className="w-full h-16 rounded-[24px] font-bold text-lg shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all">
                     {form.formState.isSubmitting ? "Activating..." : "Activate Protocol"}
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
