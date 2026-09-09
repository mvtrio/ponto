# ponto

Sistema de controle de ponto (React Native + Expo Router + Supabase), rodando em web, Android e iOS a partir de uma única base de código.

## Stack

- **Cliente**: Expo (TypeScript) + Expo Router, React Native Web
- **Backend**: Supabase (Postgres + Auth + Storage + Row Level Security)
- **Marcação de ponto**: GPS e foto **apenas no nativo** — no navegador ambos abririam
  uma janela do sistema a cada marcação, então bater ponto na web é só um clique
- **Exportação**: CSV (nativo) e PDF (expo-print)

## Regras do domínio

- **Um par por dia**: cada funcionário registra uma entrada e uma saída. Garantido pelo
  índice `punches_one_per_type_per_day`, não só pela tela.
- **Intervalo não é marcado**: é descontado como `company_settings.break_minutes`
  (padrão 60), aplicado só em dias com par completo.
- **Aprovação**: toda marcação nasce `pending` e só entra no banco de horas depois que um
  admin aprova (aba Aprovações). A view `effective_punches` é o portão.
- **Fuso**: o dia é sempre `America/Sao_Paulo`, no cliente (`lib/appDate.ts`) e no SQL.
  Alterar isso exige mudar os dois lados juntos.
- **Admin não bate ponto**: administra apenas.

## Configuração

1. Instale as dependências:
   ```
   npm install
   ```
2. Crie um projeto em [supabase.com](https://supabase.com), copie a **Project URL** e a **anon key** (Project Settings → API).
3. Copie `.env.example` para `.env` e preencha:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Rode as migrations no seu projeto Supabase (via Supabase CLI, `supabase login` + `supabase link` + `supabase db push`), ou cole o conteúdo de `supabase/migrations/*.sql` no SQL Editor do painel, na ordem numérica.

   > As migrations **não são aplicadas automaticamente**. Quando uma delas está pendente,
   > o app quebra com HTTP 400 em colunas que ainda não existem — e a tela costuma mostrar
   > isso como "nenhum registro", não como erro. Ao subir código que inclua migration,
   > aplique antes de testar.
5. Crie o primeiro usuário (pela tela de login não existe cadastro próprio — crie via painel do Supabase em Authentication → Users) e promova-o a admin:
   ```sql
   update public.profiles set role = 'admin' where id = '<uuid-do-usuario>';
   ```

## Rodando

```
npm run web       # navegador
npm run android   # emulador/dispositivo Android (Expo Go ou dev client)
npm run ios       # simulador/dispositivo iOS (requer macOS para simulador)
```

Se uma alteração não aparecer no navegador, o Fast Refresh pode não ter substituído o
módulo já carregado. Recarregue com Ctrl+Shift+R; persistindo, reinicie o servidor com
`npx expo start --web --clear`.

## Testes e verificação

```
npm test          # node --test, sem dependência extra (usa o runner e o TS do Node 24)
npm run typecheck # tsc do app + tsc dos testes (tsconfig.test.json)
```

Os testes cobrem as regras puras — fuso do dia, um par por dia e formatação de saldo.
São executados direto pelo Node, sem bundler, então os módulos testados não podem
importar o client Supabase (que exige variáveis de ambiente na importação); por isso
`nextPunchType` vive em `features/punches/punchRules.ts`, separado do serviço.

## Estrutura

- `app/` — rotas (Expo Router), agrupadas por `(auth)`, `(app)` (funcionário) e `(admin)`
- `features/` — lógica de domínio (auth, punches, corrections, hours, capture, export)
- `components/` — componentes de UI reutilizáveis
- `supabase/migrations/` — schema, RLS e funções de cálculo de horas
- `supabase/functions/admin-user-actions/` — edge function usada pelo admin para
  redefinir senha e excluir funcionário. **O fonte é uma reconstrução**: a função foi
  implantada sem estar versionada e o original não pôde ser recuperado. Leia o cabeçalho
  do arquivo antes de qualquer `supabase functions deploy`
- `lib/supabase.ts` — client Supabase
