# Supabase setup

1. Run `migrations/202610230001_initial_schema.sql` in the Supabase SQL Editor.
2. Use `.env.example` as a template for the frontend environment.
3. Register the first admin user through the application, then update that user's `profiles.role` to `admin` through the SQL Editor as described in the root README.
4. Publish only records whose source has been reviewed. Keep `verified`/`is_verified` separate from `is_published`.

The frontend deliberately uses the public publishable key and calls Supabase Auth/PostgREST directly; row-level security policies provide row restrictions. Never use a secret or service-role key in client-side variables.
