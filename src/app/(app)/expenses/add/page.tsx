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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase"
import { useProfile } from "@/context/ProfileContext"
import { collection, serverTimestamp, addDoc, updateDoc, arrayUnion, doc } from "firebase/firestore"
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Expense</CardTitle>
        <CardDescription>Add a new expense to your records.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemService"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item/Service</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Groceries, Electricity Bill" {...field} />
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
                    <Input type="number" placeholder="e.g. 250" {...field} />
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('category') === 'Other' && (
              <FormField
                control={form.control}
                name="customCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Subscriptions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="one-time">One-time</SelectItem>
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
              <Button type="submit">Add Expense</Button>
              <Button variant="outline" asChild>
                <Link href="/expenses">Cancel</Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
