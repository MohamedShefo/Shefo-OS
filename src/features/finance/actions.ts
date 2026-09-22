'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import type { FinanceTransaction, FinanceType } from '@/types/database';

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

export interface CreateTransactionPayload {
  type: FinanceType;
  amount: number;
  transaction_date: string;
  category?: string | null;
  description?: string | null;
  payment_method?: string | null;
}

export interface TransactionFilters {
  type?: FinanceType | 'all';
  category?: string | null;
  from?: string | null;
  to?: string | null;
  search?: string | null;
  limit?: number;
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<FinanceTransaction[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    let query = ctx.supabase
      .from('finance_transactions')
      .select('*')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null);
    if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.from) query = query.gte('transaction_date', filters.from);
    if (filters.to) query = query.lte('transaction_date', filters.to);
    if (filters.search?.trim()) {
      const pattern = `%${filters.search.trim().replace(/[%_\\]/g, '\\$&')}%`;
      query = query.or(`description.ilike.${pattern.replace(/[,()]/g, '')},category.ilike.${pattern.replace(/[,()]/g, '')},payment_method.ilike.${pattern.replace(/[,()]/g, '')}`);
    }
    const { data, error } = await query
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 200);
    if (error) {
      console.error('Error fetching transactions:', error.message || error);
      return [];
    }
    return (data as FinanceTransaction[]) || [];
  } catch (err) {
    console.error('Unexpected error in getTransactions:', err);
    return [];
  }
}

export async function createTransaction(
  payload: CreateTransactionPayload
): Promise<{ success: boolean; error?: string; data?: FinanceTransaction }> {
  try {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { success: false, error: 'Amount must be a non-negative number' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.transaction_date)) {
      return { success: false, error: 'Invalid date' };
    }
    if (payload.type !== 'income' && payload.type !== 'expense') {
      return { success: false, error: 'Type must be income or expense' };
    }
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { data, error } = await ctx.supabase
      .from('finance_transactions')
      .insert({
        user_id: ctx.user.id,
        type: payload.type,
        amount,
        transaction_date: payload.transaction_date,
        category: payload.category?.trim() || null,
        description: payload.description?.trim() || null,
        payment_method: payload.payment_method?.trim() || null,
      })
      .select('*')
      .single();
    if (error) {
      console.error('Error creating transaction:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/finance');
    revalidatePath('/');
    return { success: true, data: data as FinanceTransaction };
  } catch (err) {
    console.error('Unexpected error in createTransaction:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteTransaction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('finance_transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error soft-deleting transaction:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/finance');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteTransaction:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export interface MonthSummary {
  month: string;
  income: number;
  expenses: number;
  net: number;
  byCategory: Array<{ category: string; income: number; expenses: number }>;
  transactionCount: number;
}

/** Server-side monthly aggregation (bounded to one month). */
export async function getMonthSummary(month: string): Promise<MonthSummary> {
  const empty: MonthSummary = {
    month,
    income: 0,
    expenses: 0,
    net: 0,
    byCategory: [],
    transactionCount: 0,
  };
  if (!/^\d{4}-\d{2}$/.test(month)) return empty;
  try {
    const ctx = await authedUser();
    if (!ctx) return empty;
    const from = `${month}-01`;
    const toDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
    const to = `${month}-${String(toDay).padStart(2, '0')}`;
    const { data, error } = await ctx.supabase
      .from('finance_transactions')
      .select('type, amount, category')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .gte('transaction_date', from)
      .lte('transaction_date', to);
    if (error) {
      console.error('Error summarizing month:', error.message || error);
      return empty;
    }
    const rows = (data as Array<{ type: string; amount: number; category: string | null }>) || [];
    const cats = new Map<string, { income: number; expenses: number }>();
    let income = 0;
    let expenses = 0;
    for (const r of rows) {
      const amt = Number(r.amount) || 0;
      if (r.type === 'income') income += amt;
      else expenses += amt;
      const key = r.category?.trim() || 'Uncategorized';
      const entry = cats.get(key) ?? { income: 0, expenses: 0 };
      if (r.type === 'income') entry.income += amt;
      else entry.expenses += amt;
      cats.set(key, entry);
    }
    return {
      month,
      income,
      expenses,
      net: income - expenses,
      byCategory: [...cats.entries()]
        .map(([category, v]) => ({ category, ...v }))
        .sort((a, b) => b.income + b.expenses - (a.income + a.expenses)),
      transactionCount: rows.length,
    };
  } catch (err) {
    console.error('Unexpected error in getMonthSummary:', err);
    return empty;
  }
}

export async function getFinanceCategories(): Promise<string[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const { data, error } = await ctx.supabase
      .from('finance_transactions')
      .select('category')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .not('category', 'is', null)
      .limit(500);
    if (error) return [];
    const set = new Set<string>();
    for (const row of (data as Array<{ category: string | null }>) || []) {
      if (row.category?.trim()) set.add(row.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  } catch (err) {
    console.error('Unexpected error in getFinanceCategories:', err);
    return [];
  }
}
