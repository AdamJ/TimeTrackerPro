-- Add structured address and contact columns to the clients table.
-- All columns nullable so existing rows are unaffected.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS address_street  text,
  ADD COLUMN IF NOT EXISTS address_city    text,
  ADD COLUMN IF NOT EXISTS address_state   text,
  ADD COLUMN IF NOT EXISTS address_zip     text,
  ADD COLUMN IF NOT EXISTS address_country text,
  ADD COLUMN IF NOT EXISTS contact_name    text,
  ADD COLUMN IF NOT EXISTS contact_email   text,
  ADD COLUMN IF NOT EXISTS contact_website text;
