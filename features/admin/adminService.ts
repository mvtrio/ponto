import { createClient } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";
import type { Profile, Role } from "../../types/domain";

export async function fetchEmployees(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Profile[];
}

export async function fetchEmployeeById(id: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error) throw error;
  return data as unknown as Profile;
}

export interface NewEmployeeInput {
  fullName: string;
  email: string;
  password: string;
  employeeCode: string | null;
  role: Role;
}

// Cria o usuário de autenticação usando um cliente isolado (sem persistir sessão), para
// não substituir a sessão do admin logado no cliente principal. O trigger on_auth_user_created
// já cria o profile (role 'employee'); em seguida ajustamos os campos extras.
export async function createEmployee(input: NewEmployeeInput): Promise<Profile> {
  const signUpUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
  const signUpKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;
  // storageKey próprio: evita colidir/disputar lock com o cliente principal (duas instâncias
  // de GoTrueClient usando a mesma chave de storage podem travar operações concorrentes).
  const signUpClient = createClient(signUpUrl, signUpKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: `sb-temp-signup-${Date.now()}`,
    },
  });

  const { data, error } = await signUpClient.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName } },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Não foi possível criar o usuário.");

  const { data: profile, error: updateError } = await supabase
    .from("profiles")
    .update({ employee_code: input.employeeCode, role: input.role })
    .eq("id", data.user.id)
    .select("*")
    .single();
  if (updateError) throw updateError;
  return profile as unknown as Profile;
}

export interface UpdateEmployeeInput {
  fullName: string;
  employeeCode: string | null;
  role: Role;
  active: boolean;
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName,
      employee_code: input.employeeCode,
      role: input.role,
      active: input.active,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Profile;
}

export { fetchCompanySettings, updateCompanySettings } from "../company/companySettingsService";
