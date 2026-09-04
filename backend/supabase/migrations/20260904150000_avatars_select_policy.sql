-- Storage API делает INSERT ... RETURNING при загрузке файла — без SELECT-политики
-- Postgres не может подтвердить видимость только что вставленной строки и
-- валит всю операцию с "new row violates row-level security policy для objects",
-- даже если INSERT/UPDATE-политики в порядке.
-- Бакет и так публичный для чтения файлов, так что открываем select всем.
drop policy if exists avatars_select_all on storage.objects;
create policy avatars_select_all on storage.objects
  for select
  using (bucket_id = 'avatars');
