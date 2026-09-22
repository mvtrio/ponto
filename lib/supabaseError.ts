/**
 * Converte o erro do Supabase em `Error` de verdade.
 *
 * PostgrestError é um objeto simples, não instância de Error. Quem faz
 * `err instanceof Error ? err.message : "Erro ao ..."` — que é o padrão das telas —
 * acabava descartando a mensagem útil e mostrando o texto genérico. Uma regra de negócio
 * que o banco recusou ("o mês ainda não terminou") virava "erro", e o admin ficava sem
 * saber o que fazer.
 */
export function asError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;

  if (typeof error === "object" && error !== null) {
    const { message, hint, details } = error as {
      message?: string;
      hint?: string;
      details?: string;
    };
    const text = message || hint || details;
    if (text) return new Error(text);
  }

  return new Error(fallback);
}
