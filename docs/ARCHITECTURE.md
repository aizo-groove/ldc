# LDC POS — Technical Architecture

## Overview

LDC is an NF525-compliant point-of-sale system for the French market. It runs as a **fully offline-capable native desktop application** built with Tauri v2. The Rust backend manages a local SQLite database and enforces fiscal integrity; the React/TypeScript frontend provides the cashier interface.

---

## Stack

| Layer | Technology | Why |
|---|---|---|
| Desktop shell | [Tauri v2](https://tauri.app) | Native binary (macOS/Windows/Linux) with a WebView frontend. No Electron overhead. Ships as `.dmg`, `.exe`, `.deb`, `.AppImage`. |
| Backend | Rust (stable) | Memory-safe, zero-cost abstractions, ideal for fiscal hash chaining |
| Database | SQLite via [sqlx](https://github.com/launchbadge/sqlx) (non-macro API) | Embedded, zero-config, offline-first |
| Frontend | React 18 + TypeScript | Component-based UI, strict types |
| State management | [Zustand](https://github.com/pmndrs/zustand) | Lightweight, no boilerplate, works well with async Tauri commands |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) with `@theme {}` tokens | Design system defined in CSS, Material You dark palette |
| Icons | [Lucide React](https://lucide.dev) | Bundled offline (avoids Google CDN dependencies) |
| Crypto | `sha2` crate | SHA-256 for NF525 hash chain |

> **Monetary rule**: all amounts are stored and transmitted as **integer centimes** (i64 in Rust, number in TypeScript). `formatCents()` is the only place conversion to euros happens, and only for display.

---

## Repository Layout

```
ldc/
├── src/                        # React/TypeScript frontend
│   ├── App.tsx                 # App shell, screen state machine, tableContext
│   ├── App.css                 # Tailwind v4 @theme tokens (design system)
│   ├── components/layout/      # TopBar, SideNav
│   ├── features/
│   │   ├── caisse/             # Sale screen (ProductGrid, CartPanel, cart store)
│   │   ├── paiement/           # Payment screen (NumPad, method selection, split bill)
│   │   ├── confirmation/       # Post-payment receipt screen
│   │   ├── inventaire/         # Product catalogue management (soft delete, stock)
│   │   ├── cloture/            # Z-closure fiscal day-close
│   │   ├── historique/         # Transaction history
│   │   ├── tables/             # Table floor plan, drag-and-drop, open tickets
│   │   │   ├── TableView.tsx   # Canvas floor plan, room tabs, edit mode
│   │   │   ├── store.ts        # useTablesStore (rooms, tables, drag, cycleStatus)
│   │   │   └── components/
│   │   │       ├── TableTicketPanel.tsx  # Per-table ticket editor + product grid
│   │   │       └── TableFormModal.tsx    # Create/edit table modal
│   │   ├── settings/           # Business profile and feature flags
│   │   │   ├── SettingsView.tsx
│   │   │   └── store.ts        # useSettingsStore (profile, flags, init, setProfile)
│   │   ├── session/            # Session Zustand store
│   │   └── catalogue/          # Catalogue Zustand store
│   ├── lib/
│   │   ├── tauri.ts            # Typed invoke() wrappers (one per Rust command)
│   │   └── utils.ts            # formatCents(), cn(), computeTva()
│   └── types/                  # Shared TypeScript interfaces
│       ├── catalogue.ts        # Product, Category, TvaRate
│       ├── transaction.ts      # Transaction, CartLineInput, PaymentInput, PersonGroup
│       ├── session.ts          # Session, RapportX
│       ├── table.ts            # Room, RestaurantTable, TableStatus
│       ├── open_order.ts       # OpenOrder, OpenOrderLine, OpenOrderFull, OpenOrderLineInput
│       └── settings.ts         # BusinessProfile, FeatureFlags, PROFILE_FLAGS
│
└── src-tauri/
    ├── src/
    │   ├── lib.rs              # AppState, Tauri builder, command registration
    │   ├── commands/
    │   │   ├── catalogue.rs    # list_products, list_all_products, create/update/delete_product
    │   │   ├── transactions.rs # create_transaction (with stock check + decrement), verify_chain
    │   │   ├── caisse.rs       # open_session, close_session, get_rapport_x
    │   │   ├── tables.rs       # CRUD for rooms and restaurant_tables, update_table_status/position
    │   │   ├── open_orders.rs  # get/save/delete_table_order
    │   │   └── settings.rs     # get_setting, update_setting
    │   ├── db/
    │   │   ├── mod.rs          # DB init, migration runner
    │   │   ├── models/         # Rust structs with sqlx::FromRow + Serde
    │   │   └── migrations/     # SQL files (001–011), applied in order at startup
    │   └── nf525/
    │       ├── chain.rs        # SHA-256 hash engine + verify_chain()
    │       └── grand_total.rs  # Grand totals computation (stub, used at Z-closure)
    └── Cargo.toml
```

---

## Frontend Architecture

### Screen State Machine

Navigation is handled by a **union type state machine** in `App.tsx` — no URL router (a POS has no address bar).

```
AppScreen =
  | { type: "caisse" }
  | { type: "paiement"; orderNumber; totalTtc }
  | { type: "confirmation"; orderNumber; totalTtc; transaction; personGroups }
```

Route switching within `caisse` mode is handled by a separate `NavRoute` state:
```
NavRoute = "caisse" | "historique" | "inventaire" | "cloture" | "tables" | "parametres"
```

The `"tables"` route is only shown in the SideNav when the active business profile has `hasTableManagement = true` (restaurant and café profiles). The payment screen is a full-screen overlay that hides the TopBar and SideNav.

**Table context**: `App.tsx` also holds `tableContext: { tableId: string } | null`. When payment is triggered from a table ticket, `tableContext` is set so that on successful payment the open order is deleted and the table is reset to `libre`.

### Zustand Stores

| Store | File | Responsibility |
|---|---|---|
| `useCartStore` | `features/caisse/store.ts` | Cart lines, quantities, totals. In-memory only, cleared on transaction. `loadFromOrderLines()` populates the cart from an open order for table payment. |
| `useSessionStore` | `features/session/store.ts` | Active session lifecycle. `init()` calls `get_active_session` on startup; auto-opens one if none exists. `close()` calls `close_session`. |
| `useCatalogueStore` | `features/catalogue/store.ts` | Products, categories, TVA rates from DB. `load()` fetches active products; `loadAll()` fetches all including inactive (used by inventory). Exposes `getCategoryName` and `getTvaRatePct` helpers. |
| `useTablesStore` | `features/tables/store.ts` | Rooms and tables. `moveLocal()` for optimistic drag updates; `persistPosition()` saves on drag end. `cycleStatus()` cycles libre→occupe→addition→libre. |
| `useSettingsStore` | `features/settings/store.ts` | Business profile (`restaurant` / `cafe` / `commerce`) persisted in SQLite `settings` table. Derives `FeatureFlags` from profile. `init()` loads on app start. |

### Business Profiles & Feature Flags

The business profile is stored in the `settings` table (`key = 'business_profile'`). It derives a `FeatureFlags` map:

```typescript
type BusinessProfile = "restaurant" | "cafe" | "commerce";

interface FeatureFlags {
  hasSplitBill: boolean;        // "Personne suivante" button in payment
  hasTableManagement: boolean;  // "Tables" nav item + floor plan
  hasStockAlerts: boolean;      // Out-of-stock badges in inventory
  hasBarcodeScanning: boolean;  // (future) barcode scanner input
}
```

| Profile | hasSplitBill | hasTableManagement | hasStockAlerts |
|---|---|---|---|
| restaurant | ✓ | ✓ | ✗ |
| cafe | ✓ | ✓ | ✗ |
| commerce | ✗ | ✗ | ✓ |

### Tauri Bridge (`src/lib/tauri.ts`)

All calls to the Rust backend go through typed wrappers around `invoke()`. This file is the single point of truth for the JS↔Rust interface. Adding a new command = add one export here.

---

## Backend Architecture

### Database (SQLite)

Migrations in `src-tauri/src/db/migrations/` are applied sequentially at startup via the custom runner in `db/mod.rs`. Key design decisions:

- **APPEND-ONLY tables**: `transactions`, `transaction_lines`, `payments`, `journal_entries`, `clotures`, `grand_totals` are never updated or deleted. This is required by NF525.
- **All amounts as INTEGER centimes**: no REAL/FLOAT anywhere in the schema.
- **NF525 chain fields on transactions**: `sequence_no`, `previous_hash`, `hash`.
- **Soft delete on products**: `active = 0` instead of hard delete, preserving historical transaction line names.

```
tva_rates           (seed data: 5 rates)
categories          (products grouped by category)
products            (price_ttc, price_ht, tva_rate_id, track_stock, stock_qty, active)
sessions            (opening_float, status OPEN/CLOSED)
transactions        (sequence_no, hash, previous_hash — NF525 chain)
transaction_lines   (per-line TVA breakdown, immutable)
payments            (method: ESPECES/CB/CHEQUE, cash_given, cash_change)
journal_entries     (append-only audit log of all events)
clotures            (Z-closure records with NF525 hash — future)
grand_totals        (perpetual cumulative totals — future)
settings            (key/value store: business_profile, …)
rooms               (restaurant room definitions with sort_order)
restaurant_tables   (name, seats, shape, status, pos_x, pos_y, room_id)
open_orders         (one per table max, UNIQUE(table_id), deleted on payment)
open_order_lines    (cascade delete from open_orders)
```

### Stock Management

Products with `track_stock = 1` participate in stock tracking:

- **On sale** (`create_transaction`, type `VENTE`): stock is decremented per line quantity after transaction insertion.
- **On refund** (`create_transaction`, type `AVOIR`): stock is incremented.
- **Pre-sale validation**: before any line is inserted, `create_transaction` checks that each tracked product has sufficient `stock_qty`. Returns an error string if not.
- **Frontend guard** (earlier): `CaisseView.handleAddProduct` checks stock before adding to cart. `CartPanel.handleIncrement` checks before incrementing. Both show an inline error banner — the user is blocked before ever reaching the payment screen.

### Table & Open Ticket System

Tables are positioned on a canvas (1400×800) with drag-and-drop in edit mode. Each table has a `status` (`libre` / `occupe` / `addition`) and an optional `open_order`.

**Open order lifecycle:**

```
TableTicketPanel opens
  → getTableOrder(tableId) — load existing lines if any
  → if status ≠ libre and no order found → updateTableStatus("libre")  (stale state correction)

User adds/edits items, taps "Enregistrer"
  → if items empty: deleteTableOrder + updateTableStatus("libre")
  → if items present: saveTableOrder (upsert) + updateTableStatus("occupe")
  → onClose() → TableView reloads

User taps "Régler"
  → saveTableOrder (persist before leaving)
  → loadFromOrderLines into cartStore
  → onPay() → App.tsx sets tableContext + opens payment screen

validatePayment (on success)
  → deleteTableOrder(tableId)
  → updateTableStatus(tableId, "libre")
  → useTablesStore.getState().load()
  → tableContext cleared
```

`saveTableOrder` uses an upsert pattern: SELECT id WHERE table_id, then UPDATE or INSERT. Lines are fully replaced on each save (DELETE + re-INSERT).

### NF525 Compliance

NF525 is the French fiscal standard for POS software (certification required since 2018). Key requirements and their implementations:

**1. Hash chain on transactions** (`nf525/chain.rs`)

Every transaction carries a SHA-256 hash of:
```
"sequence_no|type|total_ttc|created_at|prev_hash"
```
The first transaction hashes against the sentinel `"GENESIS"`. `verify_chain()` recomputes every hash from scratch and fails fast on any break — detecting any tampering with historical records.

**2. Append-only audit journal** (`journal_entries` table)

Every significant event (`SESSION_OPEN`, `TRANSACTION_CREATED`) is written to an append-only journal with its own monotonic `sequence_no`.

**3. Z-closure** (`commands/caisse.rs → close_session`)

Closes the day, locks the session, and will generate a certified `cloture` record with its own NF525 hash (chained from the last transaction hash). Grand totals (`gt_ventes_ttc`, etc.) are perpetual — they cumulate across all sessions and can never be reset.

> The full Z-closure with `clotures` table insertion and `grand_totals` update is scaffolded (`nf525/grand_total.rs`) but not yet wired into `close_session`. Current implementation marks the session CLOSED and returns the `RapportX` aggregates.

### Command Registration

All Tauri commands are registered in `lib.rs` inside `tauri::generate_handler![...]`. Adding a new command requires:
1. Write `pub async fn my_command(state: State<'_, AppState>, ...) -> Result<T, String>` in the relevant `commands/*.rs` file
2. Add to `generate_handler!` in `lib.rs`
3. Add a typed wrapper in `src/lib/tauri.ts`

The `AppState` carries a `Arc<Mutex<SqlitePool>>`. Commands lock the pool, execute queries, and release. All commands are `async` and run on Tokio's runtime.

> **Tauri v2 naming rule**: `invoke()` parameter keys must be camelCase (e.g. `sessionId`, not `session_id`). Return values from Rust structs remain snake_case (serialized by serde).

---

## Key Data Flows

### Standard Payment Flow

```
CaisseView
  → user taps product → handleAddProduct() [stock check] → cartStore.addProduct()
  → user taps "Payer" → App.tsx openPayment()
    → screen = { type: "paiement", orderNumber, totalTtc }

PaymentView
  → user selects method(s) + enters amount(s)
  → onValidate(payments, personGroups)
    → App.tsx validatePayment()
      → createTransaction(...)  ← Tauri (stock check + decrement inside)
      → clearCart()
      → screen = { type: "confirmation", ... }
```

### Table Ticket Flow

```
TableView (floor plan)
  → user taps table → setSelectedTable(table) → renders TableTicketPanel

TableTicketPanel
  → loads existing open_order from DB
  → user adds/edits items
  → "Enregistrer" → saveTableOrder + updateTableStatus("occupe") → onClose()
  → "Régler"      → saveTableOrder → loadFromOrderLines → onPay()
    → App.tsx openPaymentFromTable(tableId) → sets tableContext → payment screen

validatePayment (success)
  → deleteTableOrder(tableId) + updateTableStatus("libre")
  → tablesStore.load() → floor plan reflects freed table
```

### Session Lifecycle

```
App mount → useSessionStore.init()
  → get_active_session()  ← Tauri
    → Some(session) → store session
    → None          → open_session(float=0) → store session

Z-closure → ClotureView
  → get_rapport_x(session_id)  ← Tauri  (TVA breakdown + payment totals)
  → user validates
  → close_session(session_id)  ← Tauri
  → session store reset → navigate to caisse
  → next transaction will trigger init() → auto-opens new session
```

---

## Design System

Defined entirely in `src/App.css` via Tailwind v4's `@theme {}` block. No JavaScript config file.

Palette: **Material You dark**, permanent dark mode.

| Token | Value | Usage |
|---|---|---|
| `primary` | `#b4c5ff` (blue lavender) | Active nav, focus rings, primary actions |
| `secondary` | `#4ae176` (validation green) | Totals, success states, libre table status |
| `error` | `#ffb4ab` (coral red) | Out of stock, error states, occupied table status |
| `surface-container-low` | `#1c1b1b` | Card backgrounds |
| `outline` | `#8d90a0` | Secondary text, inactive icons |

Border radius is intentionally tight (`--radius-xl: 0.5rem`) for a dense, industrial POS aesthetic rather than rounded consumer UI.

---

## Build & Run

```bash
# Frontend dev server only (no Tauri backend)
npm run dev

# Full Tauri dev (opens native window with hot reload)
npm run tauri dev

# Production build
npm run tauri build
# → outputs: src-tauri/target/release/bundle/
```

The SQLite database is created automatically on first launch at the Tauri app data directory:
- macOS: `~/Library/Application Support/com.ldc.pos/ldc.db`
- Linux: `~/.local/share/com.ldc.pos/ldc.db`
- Windows: `%APPDATA%\com.ldc.pos\ldc.db`
