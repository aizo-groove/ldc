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
│   │   │   ├── TableView.tsx   # Canvas floor plan, room tabs, edit mode + open orders overlay
│   │   │   ├── store.ts        # useTablesStore (rooms, tables, drag, cycleStatus)
│   │   │   └── components/
│   │   │       ├── TableTicketPanel.tsx  # Per-table ticket editor + product grid
│   │   │       └── TableFormModal.tsx    # Create/edit table modal
│   │   ├── print/              # Print system
│   │   │   ├── PrintModal.tsx          # Printer-aware print modal (shows named printers)
│   │   │   ├── PrintArea.tsx           # PDF/print CSS rendering area
│   │   │   ├── ScreenReceiptOverlay.tsx # Full-screen receipt display (no printer needed)
│   │   │   ├── usePrint.ts             # executePrint() — escpos | screen | pdf | json
│   │   │   ├── store.ts                # usePrintStore (job queue)
│   │   │   └── types.ts                # PrintJob, EscPosReceiptDoc, EscPosKitchenDoc, PrinterStatus
│   │   ├── settings/           # Business profile and feature flags
│   │   │   ├── SettingsView.tsx
│   │   │   ├── store.ts        # useSettingsStore (profile, flags, init, setProfile)
│   │   │   └── components/
│   │   │       └── PrinterManager.tsx  # Printer list CRUD + add/edit drawer
│   │   ├── onboarding/         # First-launch wizard (5 steps)
│   │   │   └── OnboardingView.tsx
│   │   ├── tutorial/           # Interactive guided tour (driver.js)
│   │   │   ├── store.ts        # useTutorialStore — pending flag
│   │   │   └── tour.ts         # startTour(hasTables) — step definitions
│   │   ├── dev/                # Dev-only tools (stripped from production)
│   │   │   └── DevToolbar.tsx  # Reset onboarding button (import.meta.env.DEV only)
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
│       ├── printer.ts          # Printer, PrinterInput, printerHasRole()
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
    │   │   ├── open_orders.rs  # get/save/delete/list_table_order, mark_sent_to_kitchen
    │   │   ├── printers.rs     # list/create/update/delete_printer, test_printer_by_id
    │   │   ├── print.rs        # ESC/POS commands — printer-table dispatch with settings fallback
    │   │   ├── settings.rs     # get_setting, update_setting
    │   │   ├── compliance.rs   # export_archive, get_db_path
    │   │   └── dev.rs          # dev_reset_onboarding (no-op in production)
    │   ├── db/
    │   │   ├── mod.rs          # DB init, PRAGMA foreign_keys=ON via SqliteConnectOptions
    │   │   ├── models/         # Rust structs with sqlx::FromRow + Serde
    │   │   └── migrations/     # SQL files (001–018), applied in order at startup
    │   ├── printer/
    │   │   └── escpos.rs       # EscPos byte builder — build_receipt, build_rapport, build_kitchen
    │   └── nf525/
    │       ├── chain.rs        # SHA-256 hash engine + verify_chain()
    │       └── grand_total.rs  # Grand totals computation (stub, used at Z-closure)
    └── Cargo.toml
```

---

## Frontend Architecture

### App Startup Sequence

On mount, `App.tsx` runs three things in parallel:

```
initSession()        ← get_active_session or auto-open
initSettings()       ← load business_profile + theme from SQLite
getSetting("store_name") + listCashiers()
  → both empty? → onboarding = "needed"  → <OnboardingView />
  → otherwise   → onboarding = "done"    → normal app
```

The `onboarding` state is `"checking" | "needed" | "done"`. While checking, the app renders nothing. After `OnboardingView` saves settings and calls `onDone()`, state flips to `"done"` and the cashier select screen appears normally.

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
| `useCashiersStore` | `features/cashiers/store.ts` | Cashier list CRUD. `load()` fetches all cashiers; used at startup to determine whether onboarding is needed. |
| `useTutorialStore` | `features/tutorial/store.ts` | Single boolean `pending` flag. Set to `true` by onboarding when the user opts into the tour. Consumed by `App.tsx` once a cashier is selected — triggers `startTour()`. |
| `usePrintStore` | `features/print/store.ts` | Current print job. `trigger(job)` queues a job for `PrintModal` to render. |

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

### Print System

The print system supports four output formats:

| Format | Behavior |
|---|---|
| `escpos` | Sends ESC/POS bytes via TCP to the configured thermal printer |
| `screen` | Dispatches `ldc:screen-receipt` custom event — `ScreenReceiptOverlay` shows a styled receipt modal |
| `pdf` | Dispatches `ldc:print-pdf` — `PrintArea` renders HTML → `window.print()` |
| `json` | Downloads the transaction data as a JSON file |

`PrintModal` is printer-aware: on open it loads the `printers` table and shows named printers as targets. For each configured receipt printer, clicking it calls `executePrint(job, type === "screen" ? "screen" : "escpos")`. PDF and JSON are always available as fallbacks.

`ScreenReceiptOverlay` is mounted globally in `App.tsx` and listens for the `ldc:screen-receipt` event. It renders a styled white receipt card over a dark backdrop.

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
- **FK constraints on every connection**: `SqliteConnectOptions::pragma("foreign_keys", "ON")` is set at pool level, not per-query — ensures enforcement across all 5 pool connections.

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
open_orders         (covers, note, sent_to_kitchen, one per table, UNIQUE(table_id))
open_order_lines    (sent_qty for delta kitchen tracking, cascade delete from open_orders)
printers            (name, printer_type, ip, port, paper_mm, roles, sort_order)
cashiers            (name, pin_hash, role)
```

### Printer Manager

Printers are stored in a `printers` table and managed via CRUD commands (`list/create/update/delete_printer`, `test_printer_by_id`).

**Printer types:**
- `thermal_tcp` — ESC/POS over TCP/IP. Requires `ip` + `port` (default 9100) + `paper_mm` (58 or 80).
- `screen` — No physical printer. The backend returns `Ok(())` silently; the frontend intercepts and shows `ScreenReceiptOverlay`.

**Printer roles** (comma-separated in `roles` field):
- `receipt` — used for customer receipts and Z-rapport
- `kitchen` — used for kitchen tickets
- `receipt,kitchen` — single printer serving both roles

**Print dispatch priority** (in `commands/print.rs`):
1. Query `printers` table for a `thermal_tcp` printer with matching role
2. If type is `screen` → return `Ok(())` (frontend handles display)
3. Fall back to legacy settings keys (`printer_ip`, `kitchen_printer_ip`) for migration continuity
4. For kitchen: if no kitchen printer found anywhere, fall back to the receipt printer

This ensures existing single-printer setups need zero reconfiguration after upgrading.

### Stock Management

Products with `track_stock = 1` participate in stock tracking:

- **On sale** (`create_transaction`, type `VENTE`): stock is decremented per line quantity after transaction insertion.
- **On refund** (`create_transaction`, type `AVOIR`): stock is incremented.
- **Pre-sale validation**: before any line is inserted, `create_transaction` checks that each tracked product has sufficient `stock_qty`. Returns an error string if not.
- **Frontend guard** (earlier): `CaisseView.handleAddProduct` checks stock before adding to cart. `CartPanel.handleIncrement` checks before incrementing. Both show an inline error banner — the user is blocked before ever reaching the payment screen.

### Table & Open Ticket System

Tables are positioned on a canvas (1400×800) with drag-and-drop in edit mode. Each table has a `status` (`libre` / `occupe` / `addition`) and an optional `open_order`.

**Open order model:**
- `open_orders`: `id`, `table_id`, `session_id`, `covers`, `note`, `sent_to_kitchen`, timestamps
- `open_order_lines`: `id`, `order_id`, `line_no`, product fields (snapshot), `quantity`, prices, `sent_qty`

`sent_qty` per line tracks how many items were already sent to the kitchen — enabling delta sends.

**Open order lifecycle:**

```
TableTicketPanel opens
  → getTableOrder(tableId) — load existing lines + covers + note if any
  → if status ≠ libre and no order found → updateTableStatus("libre")  (stale state correction)

User adds/edits items + fills note + adjusts covers
  → "Envoyer en cuisine":
      compute delta = items where quantity > sent_qty
      if first send → no subtitle; subsequent sends → subtitle "COMPLÉMENT"
      saveTableOrder (with updatedItems where sent_qty = quantity) → print kitchen ticket
      markSentToKitchen(tableId)
  → "Enregistrer":
      if items empty → deleteTableOrder + updateTableStatus("libre")
      if items present → saveTableOrder + updateTableStatus("occupe")
      → onClose() → TableView reloads (refreshes open orders + table statuses)
  → "Régler":
      saveTableOrder → loadFromOrderLines into cartStore → updateTableStatus("addition")
      → App.tsx sets tableContext + opens payment screen

validatePayment (on success)
  → deleteTableOrder(tableId)
  → updateTableStatus(tableId, "libre")
  → useTablesStore.getState().load()
  → tableContext cleared
```

**Table card enhancements:**
- `TableView` loads `listOpenOrders()` on mount and on panel close, building a `Record<tableId, OpenOrder>` map
- `TableCard` shows actual `covers` from the open order (not table seat capacity) when occupied
- A green "cuisine ✓" badge appears below the table name when `sent_to_kitchen === 1`

`saveTableOrder` uses an upsert pattern: SELECT id WHERE table_id, then UPDATE or INSERT. Lines are fully replaced on each save (DELETE + re-INSERT). The `session_id` is validated before binding — stale IDs are silently dropped to `null` to avoid FK constraint violations.

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

**4. FK integrity**

`transaction_lines.product_id` may reference a deleted product — `create_transaction` pre-checks existence and nulls stale IDs before INSERT. Product name/SKU snapshots are kept on the line, preserving traceability regardless of product lifecycle.

### Command Registration

All Tauri commands are registered in `lib.rs` inside `tauri::generate_handler![...]`. Adding a new command requires:
1. Write `pub async fn my_command(state: State<'_, AppState>, ...) -> Result<T, String>` in the relevant `commands/*.rs` file
2. Add to `generate_handler!` in `lib.rs`
3. Add a typed wrapper in `src/lib/tauri.ts`

The `AppState` carries an `Arc<DbPool>`. `DbPool` is `sqlx::SqlitePool` — already thread-safe with internal connection management. All commands are `async` and run on Tokio's runtime.

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
      → usePrintStore.trigger(job)  → PrintModal opens
```

### Table Ticket Flow

```
TableView (floor plan)
  → listOpenOrders() on mount → builds Record<tableId, OpenOrder> for card overlay
  → user taps table → setSelectedTable(table) → renders TableTicketPanel

TableTicketPanel
  → loads existing open_order (covers, note, lines with sent_qty) from DB
  → user adds/edits items, adjusts covers, fills note
  → "Envoyer en cuisine"
      → delta = lines where qty > sent_qty
      → saveTableOrder (sent_qty = qty) → printKitchenEscpos (subtitle "COMPLÉMENT" if resend)
      → markSentToKitchen
  → "Enregistrer" → saveTableOrder + updateTableStatus("occupe") → onClose()
  → "Régler" → saveTableOrder → updateTableStatus("addition") → loadFromOrderLines → onPay()
    → App.tsx openPaymentFromTable(tableId) → sets tableContext → payment screen

validatePayment (success)
  → deleteTableOrder(tableId) + updateTableStatus("libre")
  → tablesStore.load() + listOpenOrders() → floor plan reflects freed table
```

### Print Dispatch Flow

```
usePrintStore.trigger(job)
  → PrintModal opens
  → listPrinters() → filters by role "receipt"
  → user taps a printer card:
      printer_type === "screen" → executePrint(job, "screen")
        → window.dispatchEvent("ldc:screen-receipt") → ScreenReceiptOverlay renders
      printer_type === "thermal_tcp" → executePrint(job, "escpos")
        → printReceiptEscpos(doc) ← Tauri
          → get_printer_row("receipt") from printers table
          → connect_and_send(ip, port, bytes)
  → PDF / JSON always available as alternatives
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
| `tertiary` | teal/green | Kitchen send button, "cuisine ✓" badge, unsent item highlight |
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

| Build | File | macOS path |
|---|---|---|
| Production (`tauri build`) | `ldc.db` | `~/Library/Application Support/com.aizogroove.ldc/ldc.db` |
| Development (`tauri dev`) | `ldc-dev.db` | `~/Library/Application Support/com.aizogroove.ldc/ldc-dev.db` |

The dev/prod split is done in `db/mod.rs` with `cfg!(debug_assertions)`. The dev database is fully isolated — safe to delete at any time.

---

## Dev Mode

### Separate database

`cfg!(debug_assertions)` selects `ldc-dev.db` in debug builds. This prevents dev work from polluting production data and allows freely resetting state without consequences.

### DevToolbar (`features/dev/DevToolbar.tsx`)

Rendered only when `import.meta.env.DEV` is true — tree-shaken out of production bundles entirely. Displays a floating **DEV** badge in the bottom-left corner with a **Reset onboarding** button.

The button calls `dev_reset_onboarding` (Rust side, `commands/dev.rs`), which:
1. Deletes all rows from `cashiers`
2. Deletes `store_name`, `onboarding_done`, `business_profile`, `store_siret`, `printer_ip`, `printer_port` from `settings`

Then sets `onboarding = "needed"` in React state — the onboarding wizard reappears immediately without a restart.

The Rust command is compiled in all builds but returns `Err("dev only")` immediately when `cfg!(not(debug_assertions))`. The frontend guard (`import.meta.env.DEV`) ensures it is never called in production.

---

## Interactive Guided Tour

### Library

The tour is built with [driver.js](https://driverjs.com) (≈5 kB gzipped). It renders a spotlight overlay with a popover callout on each target element.

### Entry points

| Where | How |
|---|---|
| End of onboarding (Step 4) | Checkbox **"Démarrer la visite guidée"** (checked by default). On "Ouvrir LDC", sets `useTutorialStore.pending = true`. |
| Settings → À propos | **"Relancer la visite guidée"** button calls `startTour(flags.hasTableManagement)` directly. |

### Trigger flow

```
OnboardingView (Step 4)
  → user checks the tour option and clicks "Ouvrir LDC"
  → useTutorialStore.setPending(true)
  → onDone() → onboarding = "done"

CashierSelectView
  → user selects / creates a cashier → cashier set in session store

App.tsx useEffect (dep: cashier.id)
  → tutorialPending && cashier present
  → setTutorialPending(false)
  → setTimeout(() => startTour(hasTables), 600ms)   ← waits for layout
```

The 600 ms delay ensures the main app layout (SideNav, ProductGrid, CartPanel) is fully painted before driver.js queries the DOM for element positions.

### DOM anchors

Static `id` attributes added for driver.js element targeting:

| ID | Element |
|---|---|
| `tutorial-sidenav` | `<nav>` in `SideNav.tsx` |
| `tutorial-nav-{route}` | Each nav `<button>` (e.g. `tutorial-nav-caisse`, `tutorial-nav-historique`, …) |
| `tutorial-product-grid` | `<section>` in `ProductGrid.tsx` |
| `tutorial-cart` | `<section>` in `CartPanel.tsx` |
| `tutorial-pay-btn` | PAYER `<button>` in `CartPanel.tsx` |

### Persistence

On tour completion (or early dismiss), `onDestroyed` writes `tutorial_done = "true"` to the `settings` table. This is informational only — the tour can always be relaunched from Settings.
