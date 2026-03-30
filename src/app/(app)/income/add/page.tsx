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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase"
import { useProfile } from "@/context/ProfileContext"
import { collection, serverTimestamp, addDoc } from "firebase/firestore"
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Income</CardTitle>
        <CardDescription>Add a new income source to your records.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Salary, Freelance Project" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 5000" {...field} />
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
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Tech Corp" {...field} />
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
                  <FormLabel>Mode of Payment</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
            <div className="flex justify-end gap-2">
              <Button type="submit">Add Income</Button>
              <Button variant="outline" asChild>
                <Link href="/income">Cancel</Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
