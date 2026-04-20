"use client"

import { useToast } from "@/hooks/use-toast"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { doc, updateDoc, serverTimestamp } from '@/appwrite'
import { useUser, useFirestore } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import type { Debt } from "@/lib/types"
import { useState, useEffect } from "react"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  initialAmount: z.coerce.number().positive({
    message: "Amount must be a positive number.",
  }),
  type: z.enum(['credit card', 'house', 'car payment', 'mortgage', 'student loan', 'personal loan', 'other']),
})

interface EditDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt & { id: string } | null;
}

export function EditDebtDialog({ open, onOpenChange, debt }: EditDebtDialogProps) {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      initialAmount: 0,
      type: "other",
    },
  })

  useEffect(() => {
    if (debt) {
      form.reset({
        name: debt.name,
        initialAmount: debt.initialAmount,
        type: debt.type as any,
      });
    }
  }, [debt, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !currentProfile || !debt) return;

    setIsSubmitting(true);
    try {
      const debtRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/debts/${debt.id}`);
      
      await updateDoc(debtRef, {
        name: values.name,
        initialAmount: values.initialAmount,
        type: values.type,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Success",
        description: "Debt updated successfully.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating debt:", error);
      toast({
        title: "Error",
        description: "Failed to update debt.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Debt</DialogTitle>
          <DialogDescription>
            Update the details of your debt record. To record payments, use "Adjust Balance".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
