import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reads the signed-in user's role from the profiles table (the source of
 * truth). user_metadata is editable by the user, so it is not used.
 */
export async function getRole(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role ?? "labourer";
}
