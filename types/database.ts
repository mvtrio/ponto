// Gerado a partir do schema Supabase com:
//   npx supabase gen types typescript --project-id <project-id> > types/database.ts
// Este stub existe apenas para o projeto compilar antes da geração real.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
