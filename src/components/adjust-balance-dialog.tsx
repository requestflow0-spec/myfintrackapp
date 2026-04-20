"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
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
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useState } from "react"
import { useProfile } from "@/context/ProfileContext"
import { getCurrencySymbol } from "@/lib/utils"

const formSchema = z.object({
    operation: z.enum(['increase', 'decrease']),
    amount: z.coerce.number().positive({
        message: "Amount must be a positive number.",
    }),
    date: z.date({
        required_error: "A date of transaction is required.",
    }),
    description: z.string().optional(),
})

interface AdjustBalanceDialogProps {
    type: 'savings' | 'debt';
    item: { id: string; name: string; currentAmount: number };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (values: z.infer<typeof formSchema>) => Promise<void>;
}

export function AdjustBalanceDialog({ item, type, open, onOpenChange, onConfirm }: AdjustBalanceDialogProps) {
    const { currentProfile } = useProfile();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            operation: type === 'savings' ? 'increase' : 'decrease',
            amount: 0,
            date: new Date(),
            description: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            console.log("Dialog onSubmit values:", values);
            await onConfirm(values);
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to adjust balance:", error);
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

    const title = type === 'savings' ? "Adjust Savings" : "Adjust Debt";
    const description = type === 'savings'
        ? `Deposit or withdraw from ${item.name}`
        : `Pay off or increase debt for ${item.name}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}. Current Balance: {getCurrencySymbol(currentProfile?.currency)}{item.currentAmount.toLocaleString()}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="operation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Action</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select action" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {type === 'savings' ? (
                                                <>
                                                    <SelectItem value="increase">Deposit</SelectItem>
                                                    <SelectItem value="decrease">Withdraw</SelectItem>
                                                </>
                                            ) : (
                                                <>
                                                    <SelectItem value="decrease">Pay Off</SelectItem>
                                                    <SelectItem value="increase">Borrow More</SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
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
                                        <Input type="number" placeholder="0.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
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
                                        <Input placeholder="e.g. Monthly contribution" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save Transaction"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
