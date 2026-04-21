# LDC POS

A French-market point-of-sale application for small businesses — restaurants, cafés, and retail shops. Runs fully offline as a native desktop app (macOS, Windows, Linux) built with Tauri v2 + React + Rust.

---

## Features

**Sales & payment**
- Product catalogue with categories, TVA rates, and optional stock tracking
- Cart with per-line discounts, split-bill payment across multiple people
- Payment methods: cash, card, cheque, and other
- Stock check at add-to-cart time with clear error feedback

**Table management** *(restaurant/café profiles)*
- Visual floor plan with drag-and-drop table positioning
- Multi-room support
- Per-table open tickets — add products, save mid-service, resume later
- Table status cycle: libre → occupé → addition

**Cashier & session management**
- Multi-cashier login screen with optional 4-digit PIN per cashier
- Manager role with PIN-gated access to cashier management (default PIN: `0000`)
- Sessions track which cashier is active; designed for single-device use with multi-station prep

**Fiscal compliance (NF525)**
- SHA-256 hash chain on all transactions — each record links to the previous
- Immutable journal of all fiscal events
- X-report (rapport X) per session with TVA breakdown by rate
- Z-closure workflow (clôture de caisse)

**Catalogue management**
- Create, edit, and soft-delete products
- Stock tracking per product with low-stock visibility
- TVA rate assignment per product

**Business profiles**
- Restaurant, Café/Bar, Commerce — each enables or hides relevant features (e.g. table management is restaurant/café only)

---

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app) — native binary, no Electron overhead |
| Backend | Rust — fiscal hash chaining, SQLite commands, stock enforcement |
| Database | SQLite via [sqlx](https://github.com/launchbadge/sqlx) — embedded, offline-first |
| Frontend | React 18 + TypeScript |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Styling | Tailwind CSS v4 with `@theme {}` tokens — Material You dark palette |
| Icons | [Lucide React](https://lucide.dev) — bundled, no CDN dependency |

> All monetary amounts are stored and transmitted as **integer centimes** (i64 in Rust, number in TypeScript). `formatCents()` is the sole conversion point, used only for display.

---

## Getting started

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) 18+
- [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/) for your OS

### Development

```bash
npm install
npm run tauri dev
```

### Production build

```bash
npm run tauri build
```

Outputs a native installer in `src-tauri/target/release/bundle/`.

---

## Project structure

```
ldc/
├── src/                        # React/TypeScript frontend
│   ├── App.tsx                 # App shell and screen state machine
│   ├── components/layout/      # TopBar, SideNav (collapsible), navStore
│   ├── features/
│   │   ├── caisse/             # Sale screen — ProductGrid, CartPanel, cart store
│   │   ├── paiement/           # Payment screen — split bill, method selection
│   │   ├── confirmation/       # Post-payment receipt
│   │   ├── inventaire/         # Product catalogue management
│   │   ├── cloture/            # Z-closure (fiscal day-close)
│   │   ├── historique/         # Transaction history
│   │   ├── tables/             # Floor plan, open tickets, TableTicketPanel
│   │   ├── cashiers/           # Cashier select screen, cashier store
│   │   ├── session/            # Session store
│   │   ├── settings/           # Business profile, feature flags
│   │   └── catalogue/          # Shared catalogue store
│   ├── lib/
│   │   ├── tauri.ts            # Typed invoke() wrappers for every Rust command
│   │   └── utils.ts            # formatCents(), cn(), computeTva()
│   └── types/                  # Shared TypeScript interfaces
│
└── src-tauri/
    ├── src/
    │   ├── commands/           # Tauri command handlers (catalogue, caisse, transactions…)
    │   ├── db/
    │   │   ├── migrations/     # Ordered SQL migrations (001 → 013)
    │   │   └── models/         # sqlx FromRow structs
    │   ├── nf525/              # Hash chain logic
    │   └── lib.rs              # App setup, command registration
    └── tauri.conf.json
```

---

## Database migrations

Migrations run automatically at startup via `sqlx::migrate!()`. Each file in `src-tauri/src/db/migrations/` is applied in order and tracked in `_sqlx_migrations`.

Key migrations:
- `001` — foundation tables (sessions, journal, grand totals)
- `003` — sessions
- `004` — transactions and transaction lines
- `010` — rooms and tables (floor plan)
- `011` — open orders (per-table tickets)
- `012` — cashiers table, `cashier_id` and `station_id` on sessions
- `013` — default manager account (PIN: `0000`)

---

## Cashier management

On first launch two cashiers are seeded:
- **Caissier** — default cashier, no PIN
- **Manager** — manager role, PIN `0000`

To manage cashiers (add, edit, delete, change PINs): on the login screen, click **Gérer les caissiers** and enter the manager PIN.

---

## Fiscal notes

This software targets NF525 compliance for the French market:
- Every `VENTE` and `AVOIR` transaction is appended to an SHA-256 hash chain
- The journal is append-only; no record can be modified after creation
- The `verify_chain` command re-validates the entire chain and reports the first broken link
- Z-closure (`clôture`) records grand totals and locks the session

> This is a work in progress. Full NF525 certification requires an accredited audit. Use at your own risk in production.
