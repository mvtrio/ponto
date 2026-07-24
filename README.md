# ponto

Sistema de controle de ponto (React Native + Expo Router + Supabase), rodando em web, Android e iOS a partir de uma única base de código.

## Stack

- **Cliente**: Expo (TypeScript) + Expo Router, React Native Web
- **Backend**: Supabase (Postgres + Auth + Storage + Row Level Security)
- **Marcação de ponto**: GPS (expo-location) + foto (expo-image-picker)
- **Exportação**: CSV (nativo) e PDF (expo-print)

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

## Estrutura

- `app/` — rotas (Expo Router), agrupadas por `(auth)`, `(app)` (funcionário) e `(admin)`
- `features/` — lógica de domínio (auth, punches, corrections, hours, capture, export)
- `components/` — componentes de UI reutilizáveis
- `supabase/migrations/` — schema, RLS e funções de cálculo de horas
- `lib/supabase.ts` — client Supabase
