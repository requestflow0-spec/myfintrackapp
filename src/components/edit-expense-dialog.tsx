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
import { doc, updateDoc, arrayUnion, serverTimestamp } from '@/appwrite'
import { useUser, useFirestore } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import type { Expense } from "@/lib/types"
import { useState, useEffect, useMemo } from "react"

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
})

const DEFAULT_CATEGORIES = ['Groceries', 'Utilities', 'Transport', 'Entertainment', 'Health', 'Other'];

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense & { id: string } | null;
}

export function EditExpenseDialog({ open, onOpenChange, expense }: EditExpenseDialogProps) {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customCategories = useMemo(() => currentProfile?.expenseCategories || [], [currentProfile?.expenseCategories]);
  const allCategories = useMemo(() => [...new Set([...DEFAULT_CATEGORIES, ...customCategories])].sort(), [customCategories]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemService: "",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: 'Other',
      customCategory: '',
      frequency: 'one-time',
    },
  })

  useEffect(() => {
    if (expense) {
      // Check if the category is custom
      const isCustomCategory = !DEFAULT_CATEGORIES.includes(expense.category) && !customCategories.includes(expense.category);
      
      form.reset({
        itemService: expense.itemService,
        amount: expense.amount,
        date: expense.date,
        category: expense.category, // Assuming it exists in allCategories
        customCategory: '',
        frequency: expense.frequency as any,
      });

      // Handle custom categories that might not be in the predefined list yet (though they should be via add logic)
      if (!allCategories.includes(expense.category)) {
        form.setValue('category', 'Other');
        form.setValue('customCategory', expense.category);
      }
    }
  }, [expense, form, allCategories, customCategories]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !currentProfile || !expense) return;

    setIsSubmitting(true);
    try {
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

      const expenseRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/expenses/${expense.id}`);
      
      await updateDoc(expenseRef, {
        itemService: values.itemService,
        amount: values.amount,
        date: values.date,
        category: finalCategory,
        frequency: values.frequency,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Success",
        description: "Expense updated successfully.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating expense:", error);
      toast({
        title: "Error",
        description: "Failed to update expense.",
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
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>
            Update the details of your expense record.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      {!allCategories.includes('Other') && <SelectItem value="Other">Other</SelectItem>}
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
