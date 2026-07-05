# Banana Shop — Deployment Guide

Stack: **Next.js on Vercel** (free) + **PostgreSQL on Neon** (free).
Total cost: €0/month for a friend group.

---

## 1. Create the database (Neon)

1. Sign up at <https://neon.tech> and create a project (region: EU / Frankfurt).
2. In the project dashboard open **Connection string**. You'll copy two versions:
   - **Pooled** (host contains `-pooler`) → this is your `DATABASE_URL`.
   - **Direct** (toggle the "Connection pooling" switch off) → this is your `DIRECT_URL`.
3. Keep both strings handy for step 3.

## 2. Push the code to GitHub

```bash
git add -A
git commit -m "Banana Shop 2.0"
git push
```

(If the repo isn't on GitHub yet, create an empty repo there and push to it.)

## 3. Deploy on Vercel

1. Sign up at <https://vercel.com> with your GitHub account.
2. **Add New → Project** and import the repo.
3. Before the first deploy, add these **Environment Variables**
   (Settings → Environment Variables). Set them for *Production*:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | Neon **pooled** string |
   | `DIRECT_URL` | Neon **direct** string |
   | `NEXTAUTH_SECRET` | run `openssl rand -base64 32` and paste the result |
   | `NEXTAUTH_URL` | your Vercel URL, e.g. `https://banana-shop.vercel.app` |
   | `NEXT_PUBLIC_RAKE_PERCENT` | `0.02` |

   Optional (add later if you want them):
   - `INVITE_CODE` — require a code to register
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — enable buying tokens
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — push notifications

4. Click **Deploy**. The build runs `prisma migrate deploy` automatically, so the
   database tables are created on the first deploy.

## 4. Seed the first admin + demo data (once)

Run locally against the production database:

```bash
# put the SAME Neon strings in your local .env first (DATABASE_URL + DIRECT_URL)
npm run db:seed
```

This creates the admin account and demo users. **Log in and change the admin
password / delete demo users afterwards** from the Admin → Users panel.

Default seed logins: `admin@test.com / admin123` (+ alice/bob/charlie).

---

## Enabling Stripe (buying tokens) — optional

1. Create a Stripe account, get your live keys.
2. Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel.
3. In Stripe → Developers → Webhooks, add an endpoint:
   `https://your-domain/api/stripe/webhook`, event `checkout.session.completed`.
4. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Redeploy. The "Buy Tokens" buttons on the profile page now work (1 token = €1).

Until Stripe is configured, the buy buttons show a friendly "ask an admin"
notice — admins can top up balances manually from Admin → Users → Grant tokens.

---

## Local development

Local dev now also uses Postgres (no more SQLite). Easiest: create a **second
Neon branch** (Neon → Branches → New branch, e.g. `dev`) and put *its* pooled +
direct strings in your local `.env`. Then:

```bash
npm install
npx prisma migrate deploy   # or: npm run db:migrate  to create new migrations
npm run db:seed             # first time only
npm run dev
```
