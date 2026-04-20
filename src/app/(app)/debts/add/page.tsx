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
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ArrowLeft, Landmark, Calculator } from "lucide-react"
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
import { useUser, useFirestore, addDocumentNonBlocking } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import { collection, serverTimestamp } from '@/appwrite'
import { useRouter } from "next/navigation"
import Link from "next/link"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  initialAmount: z.coerce.number().positive({
    message: "Amount must be a positive number.",
  }),
  interestRate: z.coerce.number().min(0).max(100).optional(),
  type: z.enum(['credit card', 'house', 'car payment', 'mortgage', 'student loan', 'personal loan', 'other']),
})

export default function AddDebtPage() {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      initialAmount: 0,
      interestRate: 0,
      type: "other",
    },
  })

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

    const debtsCol = collection(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/debts`);
    addDocumentNonBlocking(debtsCol, {
      ...values,
      currentBalance: values.initialAmount,
      profileId: currentProfile.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    router.push('/debts');
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
          <Link href="/debts">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Return to Liabilities
          </Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr,400px] gap-12 items-start">
        <div className="space-y-8">
          <div>
            <h2 className="text-5xl font-extrabold font-display tracking-tight text-foreground mb-4">Structure a <span className="text-primary italic">Liability.</span></h2>
            <p className="text-lg font-medium text-muted-foreground/80 leading-relaxed max-w-xl">
              Recording your debt is the first step toward curation. Define the parameters of your obligation to visualize the path to freedom.
            </p>
          </div>

          <div className="bg-surface-low rounded-[32px] p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Landmark className="w-64 h-64 -mt-16 -mr-16" />
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8 relative z-10">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Asset Identity</FormLabel>
                      <FormControl>
                        <Input className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20 placeholder:text-muted-foreground/40" placeholder="e.g. Sapphire Preferred Visa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="initialAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Initial Magnitude</FormLabel>
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
                    name="interestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Annual Percentage Rate (APR)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20" type="number" step="0.01" placeholder="e.g. 5.2" {...field} />
                            <span className="absolute right-6 top-4 font-bold text-muted-foreground">%</span>
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
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Instrument Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-14 bg-background border-none rounded-2xl px-6 text-lg font-semibold shadow-sm focus-visible:ring-primary/20 capitalize">
                              <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-none shadow-xl">
                            <SelectItem value="credit card" className="capitalize cursor-pointer">Credit Card</SelectItem>
                            <SelectItem value="house" className="capitalize cursor-pointer">House</SelectItem>
                            <SelectItem value="car payment" className="capitalize cursor-pointer">Car Payment</SelectItem>
                            <SelectItem value="mortgage" className="capitalize cursor-pointer">Mortgage</SelectItem>
                            <SelectItem value="student loan" className="capitalize cursor-pointer">Student Loan</SelectItem>
                            <SelectItem value="personal loan" className="capitalize cursor-pointer">Personal Loan</SelectItem>
                            <SelectItem value="other" className="capitalize cursor-pointer">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-background/50">
                  <Button variant="ghost" asChild className="h-12 px-6 rounded-xl font-bold border border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-background/50">
                    <Link href="/debts">Discard Entry</Link>
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 px-8 rounded-xl font-bold shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all">
                    {form.formState.isSubmitting ? "Confirming..." : "Confirm Liability"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>

        <div className="space-y-6 pt-16">
          <Card className="bg-card border-none shadow-sm rounded-[32px] overflow-hidden">
            <CardContent className="p-8">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-display mb-3 text-foreground">The Curated Impact</h3>
              <p className="text-sm font-medium text-muted-foreground/90 leading-relaxed">
                Adding this debt will adjust your <span className="font-bold text-foreground">Debt-to-Asset ratio</span> actively. We recommend tracking the interest rate effectively to minimize long-term payout velocity.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-low border-none shadow-none rounded-[32px] overflow-hidden">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold font-display mb-3 text-foreground">Editorial Guide</h3>
              <p className="text-sm font-medium text-muted-foreground/90 leading-relaxed">
                Debts aren't just numbers; they're commitments of future time. Categorize accurately to receive bespoke repayment strategies.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
