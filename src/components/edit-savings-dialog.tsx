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
import type { SavingsAccount } from "@/lib/types"
import { useState, useEffect } from "react"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  currentAmount: z.coerce.number().min(0, {
    message: "Amount must be a non-negative number.",
  }),
  type: z.enum(['cash', 'investment', 'other']),
  description: z.string().optional(),
})

interface EditSavingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: SavingsAccount & { id: string } | null;
}

export function EditSavingsDialog({ open, onOpenChange, saving }: EditSavingsDialogProps) {
  const { user } = useUser();
  const { currentProfile } = useProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      currentAmount: 0,
      type: "cash",
      description: "",
    },
  })

  useEffect(() => {
    if (saving) {
      form.reset({
        name: saving.name,
        currentAmount: saving.currentAmount,
        type: saving.type as any,
        description: saving.description || "",
      });
    }
  }, [saving, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !currentProfile || !saving) return;

    setIsSubmitting(true);
    try {
      const savingRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}/savingsAccounts/${saving.id}`);
      
      await updateDoc(savingRef, {
        name: values.name,
        currentAmount: values.currentAmount,
        type: values.type,
        description: values.description,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Success",
        description: "Savings account updated successfully.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating savings account:", error);
      toast({
        title: "Error",
        description: "Failed to update savings account.",
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
          <DialogTitle>Edit Savings Account</DialogTitle>
          <DialogDescription>
            Update the details of your savings account. To add/remove funds, use "Adjust Balance".
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
                    <Input placeholder="e.g. Emergency Fund" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 15000" {...field} />
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
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. For a rainy day" {...field} />
                  </FormControl>
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
