import { supabase } from '@/db/supabase';
import type { Branch } from '@/types/index';

export async function getBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function addBranch(
  data: Omit<Branch, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await supabase
    .from('branches')
    .insert(data);
  if (error) throw error;
}

export async function updateBranch(
  id: string,
  updates: Partial<Omit<Branch, 'id' | 'created_at' | 'shop_id'>>
): Promise<void> {
  const { error } = await supabase
    .from('branches')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteBranch(id: string): Promise<void> {
  const { error } = await supabase
    .from('branches')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
