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
import { useUser, useFirestore, addDocumentNonBlocking } from "@/firebase"
import { useProfile } from "@/context/ProfileContext"
import { collection, serverTimestamp } from "firebase/firestore"
import { useRouter } from "next/navigation"
import Link from "next/link"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  initialAmount: z.coerce.number().positive({
    message: "Amount must be a positive number.",
  }),
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Debt</CardTitle>
        <CardDescription>Add a new debt to your records.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Visa Gold, Car Loan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="initialAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 5000" {...field} />
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
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="credit card">Credit Card</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="car payment">Car Payment</SelectItem>
                      <SelectItem value="mortgage">Mortgage</SelectItem>
                      <SelectItem value="student loan">Student Loan</SelectItem>
                      <SelectItem value="personal loan">Personal Loan</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="submit">Add Debt</Button>
              <Button variant="outline" asChild>
                <Link href="/debts">Cancel</Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
