import { supabase } from "../../lib/supabase";
import type { Profile } from "../../types/domain";

export async function fetchEmployees(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Profile[];
}

export { fetchCompanySettings, updateCompanySettings } from "../company/companySettingsService";
