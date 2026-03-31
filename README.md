# I.C.E. — Inner Circle Exchange

A private prediction market platform for friend groups. Bet virtual tokens on real-life events. Odds update dynamically based on your admin-set base probability and the actual distribution of bets.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Required:
- `DATABASE_URL` — SQLite: `file:./dev.db` (default)
- `NEXTAUTH_SECRET` — Random secret: `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000`

Optional:
- `INVITE_CODE` — If set, users must provide this code to register
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Enable token purchases

### 3. Set up the database

```bash
npx prisma migrate dev --name init
```

### 4. Seed with sample data

```bash
npm run db:seed
```

This creates:
- **Admin**: `admin@test.com` / `admin123`
- **Alice**: `alice@test.com` / `alice123`
- **Bob**: `bob@test.com` / `bob123`
- **Charlie**: `charlie@test.com` / `charlie123`
- 3 sample open markets with bets placed

### 5. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
app/
├── (auth)/          # Login & register pages (no navbar)
├── admin/           # Admin panel (ADMIN role only)
│   ├── events/new   # Create market
│   ├── events/[id]  # Manage market (close, resolve, cancel)
│   └── users/       # Grant tokens to users
├── event/[id]/      # Event detail with live odds + bet form
├── leaderboard/     # Rankings by net profit
├── profile/         # User's balance, bet history, stats
└── page.tsx         # Main feed (open markets)

api/
├── auth/            # NextAuth + registration
├── bets/            # Place bets
├── events/          # Read events
├── leaderboard/     # Leaderboard data
├── admin/           # Admin: create events, resolve, grant tokens
└── stripe/          # Checkout session + webhook

lib/
├── odds.ts          # Odds engine (pure functions, unit-testable)
├── auth.ts          # NextAuth config
├── prisma.ts        # Prisma client singleton
├── stripe.ts        # Stripe client (null when unconfigured)
└── token-packages.ts # Token package definitions

prisma/
├── schema.prisma    # Database schema
└── seed.ts          # Sample data
```

---

## Odds Engine

The core mechanic is in `lib/odds.ts`:

```
weight_i = baseProbability_i × (1 + totalStaked_i)
dynamicProbability_i = weight_i / Σ(weight_j)
odds_i = 1 / dynamicProbability_i
payout = tokensStaked × lockedOdds
```

The admin's base probability acts as a Bayesian prior. Bet volume shifts odds toward more-bet outcomes but never fully overrides the prior. Odds are **locked at the moment the bet is placed** (`lockedOdds` field on `Bet`).

---

## Token System

- 1 Token ≈ €2 in real purchasing power (reference: one Monster can)
- Admins can grant tokens to any user via `/admin/users`
- Stripe integration is stubbed — add keys to `.env` to activate token purchases
- Token packages: Starter (10 tokens), Pack (60 tokens), Bag (150 tokens)

---

## Auth

- Email + password with bcrypt
- First registered user automatically becomes ADMIN
- Set `INVITE_CODE` in `.env` to require an invite code for registration
- JWT sessions (30-day expiry)
- Admin routes protected server-side in layout + middleware

---

## Stripe Setup (optional)

1. Create a Stripe account and products for each token package
2. Add keys to `.env`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (from Stripe CLI or dashboard)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Configure webhook endpoint in Stripe dashboard: `https://yourdomain.com/api/stripe/webhook`
4. Listen for event: `checkout.session.completed`

---

## Production Deployment

Switch to PostgreSQL by updating `DATABASE_URL` and `schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then run:
```bash
npx prisma migrate deploy
```

Recommended: Deploy on [Railway](https://railway.app) or [Vercel](https://vercel.com) with a PostgreSQL add-on.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio |
