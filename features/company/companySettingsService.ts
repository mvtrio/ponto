import { supabase } from "../../lib/supabase";
import type { CompanySettings } from "../../types/domain";

export async function fetchCompanySettings(): Promise<CompanySettings> {
  const { data, error } = await supabase.from("company_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as unknown as CompanySettings;
}

export async function updateCompanySettings(standardDailyMinutes: number): Promise<CompanySettings> {
  const { data, error } = await supabase
    .from("company_settings")
    .update({ standard_daily_minutes: standardDailyMinutes, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as CompanySettings;
}
