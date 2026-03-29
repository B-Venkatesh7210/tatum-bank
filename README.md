# Tatum Bank

**Tatum Bank** is a full-stack example of a **custodial crypto “bank”**: users sign up in a mobile app, the backend provisions **HD wallets** and **Tatum Virtual Accounts** per blockchain, and the system can track **deposits**, **withdrawals**, **internal transfers**, and (optionally) **fiat on-ramp** via Transak—with **PostgreSQL** as the source of truth for users, balances, and history. A **REST API** (Express + TypeScript) implements auth, custody, and webhooks; the **Expo** client is the end-user wallet UI.

**Stack in brief:** Node.js API · [Tatum](https://tatum.io/) (Virtual Accounts, chain wallets, notifications) · PostgreSQL · React Native (Expo).

## Important: Tatum Virtual Accounts and demos

Tatum **restricts Virtual Accounts (VA)** to eligible accounts (for example, **Pay as You Go and higher tiers**, with additional limits described in [Tatum’s Virtual Accounts documentation](https://docs.tatum.io/docs/virtual-accounts)). Most flows in this project—deposit addresses, ledger balances, internal transfers, and withdrawals—go through **Tatum’s VA APIs**.

Because of that policy, a **fully working end-to-end demo on a free Tatum tier** is often **not possible** for new API keys. The **integration in this repository is wired end-to-end** (API, database, mobile app, webhooks, optional Transak/KMS paths), but **you will need a Tatum plan that includes Virtual Accounts** (and any other requirements Tatum sets) to exercise custody flows against production API keys.

---

## Prerequisites

- **Node.js** 18 or newer  
- **PostgreSQL** 14+ (local install, Docker, or cloud)  
- **npm** (comes with Node)  
- For the **mobile app**: [Expo CLI](https://docs.expo.dev/get-started/installation/) via `npx`, and either [Expo Go](https://expo.dev/go) on a physical device or an iOS Simulator / Android emulator  

---

## 1. Clone the repository

```bash
git clone <your-fork-or-remote-url> tatum-bank
cd tatum-bank
```

---

## 2. Backend (API)

### Install dependencies

```bash
npm install
```

### Configure environment

Copy the example env file and edit it:

```bash
cp .env.example .env
```

Set at least:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (required for auth, wallets, and webhooks) |
| `JWT_SECRET` | Secret for signing JWTs (required for `/auth` and protected routes) |
| `TATUM_API_KEY` | Tatum API key from the [Tatum Dashboard](https://dashboard.tatum.io/) |
| `PORT` | Optional; defaults to `3000` |

Optional variables (webhooks, KMS, Transak) are documented in `.env.example`. For local development you can set `WEBHOOK_SKIP_HMAC_VERIFY=true` only when you understand the security implications.

### Create the database schema

Ensure PostgreSQL is running and the database in `DATABASE_URL` exists, then:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

(On Windows or if `DATABASE_URL` is not exported, paste your connection string in place of `"$DATABASE_URL"`.)

### Run the API

Development (hot reload):

```bash
npm run dev
```

Production-style:

```bash
npm run build
npm start
```

### Verify the server

```bash
curl -s http://127.0.0.1:3000/health
```

You should see JSON with `"status":"ok"`.

### Register a user (example)

```bash
curl -s -X POST http://127.0.0.1:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"password12345"}'
```

The mobile app’s demo copy may reference a fixed password; use whatever you register here consistently.

---

## 3. Mobile app (Expo)

The client lives in the `mobile/` directory and targets **Expo SDK 54** so it matches **Expo Go’s supported SDK** (check **Settings → Supported SDK** in Expo Go if you see an incompatibility message).

```bash
cd mobile
npm install
```

### Point the app at your API

Create `mobile/.env`:

```bash
# Simulator on the same machine as the API:
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000

# Physical device: use your computer's LAN IP, not 127.0.0.1
# EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

`127.0.0.1` on a **phone** refers to the phone itself, not your PC—use the machine’s **Wi‑Fi IP** when testing on a real device. Keep the phone and computer on the same network.

### Start Metro

```bash
npx expo start
```

Then open the project in Expo Go (QR code) or press `i` / `a` for simulators. After changing `mobile/.env`, restart Expo (use `npx expo start -c` to clear cache if needed).

---

## 4. Project layout (high level)

| Path | Role |
|------|------|
| `src/` | Express app: auth, wallet/custody, deposit, withdraw, transactions, webhooks, Transak |
| `db/schema.sql` | PostgreSQL schema |
| `mobile/` | Expo React Native UI |

---

## 5. Troubleshooting

- **`relation "users" does not exist`** — Run `psql … -f db/schema.sql` against the same database as `DATABASE_URL`.  
- **Expo Go “incompatible project”** — Align the `mobile/` app’s Expo SDK with **Expo Go → Supported SDK** (this repo pins SDK 54 for that reason).  
- **Mobile “network error”** — Fix `EXPO_PUBLIC_API_URL` (LAN IP for a physical device; ensure the API is reachable and the firewall allows it).  
- **Tatum errors about Virtual Accounts / deposit addresses** — See the disclaimer at the top; upgrade or qualify your Tatum account per their current docs.  

---

## License

MIT (see repository if a `LICENSE` file is present).
