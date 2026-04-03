import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrencySymbol(_currencyCode?: string) {
  // Always return $ as per user request to lock to USD for now.
  return "$";
}
