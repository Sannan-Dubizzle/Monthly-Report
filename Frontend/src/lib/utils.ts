import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMonth(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, h:mm a')
  } catch {
    return dateStr
  }
}

export function getMonthParam(dateStr: string): string {
  // Returns 'YYYY-MM' from a 'YYYY-MM-DD' string
  return dateStr.slice(0, 7)
}

export function getPreviousMonth(): string {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return format(prev, 'yyyy-MM-dd')
}

export function getCurrentMonthParam(): string {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return format(prev, 'yyyy-MM')
}
