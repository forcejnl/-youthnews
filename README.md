# YouthNews

YouthNews is a public campus-news website with an admin-only CMS.

## Public site
- No public user account, signup, or user login.
- Home, RMUTK News, General, Training News, Career, Student Voice.
- Category pages keep Trending Now, News Categories, Upcoming Events, Quick News, filters, and Trending Topics.
- Search and article pages are public.

## Admin
Open `/admin` and sign in with the Render environment variables `ADMIN_USER` and `ADMIN_PASSWORD`.

## Required Render environment variables
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `ADMIN_USER`
- `ADMIN_PASSWORD`

The default credentials in the code are only a development fallback. Set real values on Render before using the CMS publicly.

## Supabase Storage
Create a public bucket named `news-images`. Admin image uploads are sent server-side with the service-role key; the key is never exposed to the browser.
