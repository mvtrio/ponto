-- Bucket privado para fotos de marcação de ponto.
-- Estrutura de path: {employee_id}/{yyyy}/{mm}/{dd}/{punch_type}_{timestamp}.jpg
-- O employee_id é o primeiro segmento do path, usado para restringir acesso.

insert into storage.buckets (id, name, public)
values ('punch-photos', 'punch-photos', false)
on conflict (id) do nothing;

create policy "punch_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'punch-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "punch_photos_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'punch-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- Sem policies de update/delete: fotos são imutáveis, assim como as marcações.
