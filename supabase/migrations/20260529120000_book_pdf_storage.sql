ALTER TABLE books
  ADD COLUMN IF NOT EXISTS pdf_storage_path text;
