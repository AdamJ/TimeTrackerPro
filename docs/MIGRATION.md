# Database Migration Guide

If you already have a Supabase project with the old schema, you'll need to run this migration to update to the new relational structure.

## ⚠️ Important: Backup Your Data First!

Before running this migration, make sure to:

1. Export your existing data from the Supabase dashboard
2. Or use the app's export functionality to backup your data

## Migration Steps

### 1. Drop Old Tables (if they exist)

```sql
-- Drop old tables and their triggers
DROP TRIGGER IF EXISTS trg_update_current_updated_at ON current_day;
DROP TRIGGER IF EXISTS trg_update_archived_updated_at ON archived_days;
DROP TABLE IF EXISTS current_day;
DROP TABLE IF EXISTS archived_days;
```

### 2. Run the New Schema

Execute the entire `supabase/schema.sql` file in your Supabase SQL editor.

### 3. Verify Row Level Security

Make sure RLS is enabled and policies are active:

```sql
-- Check that RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('projects', 'categories', 'tasks', 'archived_days', 'current_day');

-- Should show rowsecurity = true for all tables
```

### 4. Test with a New Account

1. Create a test user account
2. Add some data through the app
3. Verify data appears correctly in the database tables

## What Changed

### Old Structure

- `archived_days.tasks` - JSONB blob containing all task data
- `current_day.tasks` - JSONB blob containing current tasks
- Projects and categories stored in localStorage only

### New Structure

- `tasks` table - Individual task records with proper columns
- `projects` table - Project definitions with hourly rates
- `categories` table - Category definitions
- `archived_days` table - Day summaries without embedded tasks
- `current_day` table - Current day state without embedded tasks

## Benefits of New Structure

1. **Proper Relational Data**: Tasks, projects, and categories are now in separate tables
2. **Better Queries**: Can filter and search by project, client, category, etc.
3. **Data Integrity**: Foreign key relationships ensure data consistency
4. **Performance**: Indexed columns for faster queries
5. **Scalability**: Can handle large amounts of data more efficiently

## Troubleshooting

### If Migration Fails

1. Check Supabase logs for error details
2. Ensure your user has proper permissions
3. Try running schema sections one at a time

### If Data is Missing After Migration

1. Check that localStorage data was present before signing in
2. Verify the migration function completed without errors
3. Check browser console for migration error logs

### If App Shows Errors

1. Clear browser cache and localStorage
2. Sign out and sign back in
3. Check browser developer tools for error messages
