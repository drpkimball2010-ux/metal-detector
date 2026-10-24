# Metal Stack


Log gold, silver, platinum and palladium purchases and see what they're worth at live spot prices.
Next.js website on top of the Supabase backend (prices update every 10 minutes from MetalpriceAPI).

## What's in here

| Path | What it does |
|---|---|
| `app/page.tsx` | Shows the login screen or the dashboard |
| `components/Auth.tsx` | Sign in / create account |
| `components/Dashboard.tsx` | Total value, gain or loss, metal breakdown, live spot prices |
| `components/PurchaseList.tsx` | Your purchases, with spot when bought, premium, and gain or loss |
| `components/AddPurchase.tsx` | The purchase form: presets, purity grades, Bought just now, date, paid |
| `lib/metals.ts` | Metals, purity grades, presets, and the fine-ounce math |
| `lib/supabase.ts` | Connection to your Supabase project |
| `.env.local` | Your Supabase URL and publishable key (both public by design) |

The spot price at purchase, and "paid at spot" when the paid box is blank, are set by the database,
not by this app, so nobody can fake them.

## Run it on your computer

1. Install Node.js 20 or newer from https://nodejs.org (the LTS version).
2. Open a terminal in this folder and run:
   ```
   npm install
   npm run dev
   ```
3. Open http://localhost:3000

## Before the first sign-up: Supabase settings

In Supabase, go to **Authentication -> URL Configuration**:
- **Site URL:** `http://localhost:3000` while testing; change it to your real address after deploying.
- **Redirect URLs:** add both `http://localhost:3000` and your Vercel address (e.g. `https://metal-stack.vercel.app`).

New accounts get a confirmation email by default. Supabase's built-in email sender is limited to a
few emails an hour, which is fine for testing. Before launch, set up your own email sender under
**Authentication -> Emails -> SMTP Settings** (Resend, Postmark, etc.).

## Put it online (Vercel, free for small projects)

1. Put this folder in a GitHub repository (github.com -> New repository, then upload the files,
   or use GitHub Desktop). `.env.local` is left out on purpose.
2. Go to https://vercel.com, sign in with GitHub, click **Add New -> Project**, and pick the repository.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ljsbovudqtbhmomqjgzh.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = your `sb_publishable_...` key
4. Click **Deploy**. Then add the Vercel address to Supabase's Site URL and Redirect URLs (above).

## Never put these in the app

The secret / service_role key, `CRON_SECRET`, and your MetalpriceAPI key belong only in Supabase.
