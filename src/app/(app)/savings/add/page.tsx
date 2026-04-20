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
import { ArrowLeft, TrendingUp, ShieldCheck, FileCheck, Cloud } from "lucide-react"
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
import { useUser, useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/appwrite"
import type { SavingsAccount } from "@/lib/types"
import { getCurrencySymbol } from "@/lib/utils"
import { useProfile } from "@/context/ProfileContext"
import { collection, serverTimestamp } from '@/appwrite'
import { useRouter } from "next/navigation"
import Link from "next/link"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  currentAmount: z.coerce.number().positive({
    message: "Amount must be a positive number.",
  }),
  type: z.enum(['cash', 'investment', 'other']),
  description: z.string().optional(),
})

export default function AddSavingsPage() {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      currentAmount: 0,
      type: "cash",
      description: "",
    },
  })

  const savingsQuery = useMemoFirebase(() => {
    if (!user || !currentProfile) return null;
    return collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/savingsAccounts`);
  }, [user, currentProfile, firestore]);

  const { data: savingsData, isLoading } = useCollection<SavingsAccount>(savingsQuery);

  const totalSavings = savingsData?.reduce((acc, curr) => acc + curr.currentAmount, 0) ?? 0;
  const totalGoal = savingsData?.reduce((acc, curr) => acc + (curr.goalAmount || 0), 0) ?? 0;
  const progressPercentage = totalGoal > 0 ? Math.min(100, Math.max(0, (totalSavings / totalGoal) * 100)) : 0;

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    if (!currentProfile) {
      toast({
        title: "Error",
        description: "No profile selected. Please select a profile.",
        variant: "destructive",
      })
      return;
    }

    const savingsCol = collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/savingsAccounts`);
    addDocumentNonBlocking(savingsCol, {
      ...values,
      profileId: currentProfile.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    router.push('/savings');
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
          <Link href="/savings">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Portfolio
          </Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr,450px] gap-16 items-start">
        
        {/* Left Column: Context & Imagery */}
        <div className="space-y-12 pt-8">
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-primary mb-6">Curation 04</div>
            <h2 className="text-6xl font-extrabold font-display tracking-tight text-foreground mb-6 leading-tight">
              Cultivating Your<br/><span className="text-primary italic">Resilience.</span>
            </h2>
            <p className="text-lg font-medium text-muted-foreground/90 leading-relaxed max-w-md">
              Savings aren't just numbers; they are the buffer between your present and your future peace of mind. Define a new goal to curate your wealth strategy.
            </p>
          </div>

          <div className="bg-surface-low rounded-[32px] p-8 max-w-md">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary">Current Liquidity</h3>
              <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-4xl font-extrabold font-display tracking-tight text-foreground mb-6">
              {isLoading ? "..." : `${getCurrencySymbol(currentProfile?.currency)}${totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            {totalGoal > 0 && (
              <>
                <div className="h-2 bg-background rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <p className="text-[10px] font-bold text-muted-foreground">You are currently {progressPercentage.toFixed(0)}% towards your goal of {getCurrencySymbol(currentProfile?.currency)}{totalGoal.toLocaleString()}.</p>
              </>
            )}
            {totalGoal === 0 && !isLoading && (
               <p className="text-[10px] font-bold text-muted-foreground">You haven't set any specific goals for your savings yet.</p>
            )}
          </div>

          <div className="h-48 rounded-[32px] overflow-hidden relative max-w-md bg-gradient-to-br from-foreground to-foreground/80">
            <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1616070621376-7ebd8bed8366?q=80&w=600')] bg-cover bg-center mix-blend-overlay"></div>
            <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
              <h4 className="text-white font-bold mb-1">The Editorial Edge</h4>
              <p className="text-white/70 text-xs font-medium">A well-defined fund is the first step to luxury investment.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="bg-surface-low rounded-[40px] p-8 md:p-12">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Fund Name</FormLabel>
                    <FormControl>
                      <Input className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20 placeholder:text-muted-foreground/40" placeholder="e.g. Emergency Fund" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="currentAmount"
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Type</FormLabel>
                      <FormControl>
                         <div className="flex bg-background p-1.5 rounded-[20px] shadow-sm">
                            {['cash', 'investment', 'other'].map((opt) => {
                               const isSelected = field.value === opt;
                               return (
                                 <button
                                   key={opt}
                                   type="button"
                                   onClick={() => field.onChange(opt)}
                                   className={`flex-1 rounded-[16px] py-3 text-[10px] sm:text-xs font-bold capitalize transition-all ${isSelected ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                                 >
                                   {opt}
                                 </button>
                               );
                            })}
                         </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                     <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Description <span className="lowercase text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <textarea 
                        className="w-full h-32 bg-background border-none rounded-2xl p-6 text-base font-medium shadow-sm focus-visible:ring-primary/20 placeholder:text-muted-foreground/40 resize-none outline-none focus:ring-2 ring-primary/20 transition-all" 
                        placeholder="Describe the purpose of this fund..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-8 flex items-center justify-between gap-6">
                <div className="flex items-center gap-3 bg-background p-4 rounded-2xl flex-1 border border-primary/5 shadow-sm">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-[9px] font-bold text-muted-foreground/80">Your changes will be immediately reflected across your editorial dashboard.</p>
                </div>
                <Button type="submit" disabled={form.formState.isSubmitting} className="h-16 px-8 rounded-[24px] font-bold text-lg shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all shrink-0">
                  {form.formState.isSubmitting ? "Saving..." : "Confirm New Asset"}
                </Button>
              </div>

            </form>
          </Form>

          {/* Validation Badges footer */}
          <div className="mt-12 pt-8 border-t border-background flex justify-around opacity-60">
             <div className="text-center">
                <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Security</div>
                <div className="text-xs font-bold text-primary flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3"/> AES-256 Encrypted</div>
             </div>
             <div className="text-center">
                <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Audited</div>
                <div className="text-xs font-bold text-primary flex items-center justify-center gap-1"><FileCheck className="w-3 h-3"/> Monthly Reports</div>
             </div>
             <div className="text-center">
                <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Sync</div>
                <div className="text-xs font-bold text-primary flex items-center justify-center gap-1"><Cloud className="w-3 h-3"/> Cloud Real-time</div>
             </div>
          </div>
        </div>

      </div>
    </div>
  )
}
