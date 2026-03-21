# MiBudget UI/UX Formative Specification & Component Matrix (Stitch Core Directives)

**VERSION 4.0 (STRATEGIC UX + ARCHITECTURAL MATRIX)**
**AUTHOR: Core Engineering / UI Architecture Team**

This document serves as the absolute, definitive source of truth for every pixel, transition, border radius, spacing token, accessibility ARIA requirement, and z-index layer within the MiBudget application. Google Stitch must ingest this entire matrix as absolute law. Any deviation from these explicit component rules is considered a critical defect.

---

## 0. Strategic UX Philosophy & Product Context (The "Why")
Before applying any CSS tokens, the designer (or Stitch AI) must fundamentally understand what MiBudget is building and who it serves. MiBudget is **not** a basic reactive expense tracker (like Mint was); it is a **highly proactive, forward-looking financial forecasting engine**.

### 0.1 The Target User
Our core demographic consists of middle-to-upper-class professionals and dual-income households managing complex, multi-tiered cash flows (e.g., base salaries, end-of-year bonuses, rental properties, and dedicated 'Slush Funds' for major life events). They have high financial literacy but zero patience for clunky, spreadsheet-like interfaces.

### 0.2 Core Emotional Drivers
The UI must evoke **Cognitive Peace, Reassurance, and Premium Trust**. 
*   Because we are dealing with high-stakes user financial data, the application must feel as secure, dense, and bulletproof as a Tier-1 investment banking terminal (like refined Bloomberg/Saxo), but as approachable and frictionless as an Apple product.
*   **Vibe:** Sleek, deeply professional, quiet confidence. Absolutely no playful vectors, cartoonish illustrations, or overwhelming gamification.

### 0.3 UX Principles for Stitch Decision-Making
When Stitch encounters an ambiguous UI challenge, it must resolve it using these three pillars:
1.  **"Forward-Looking Clarity":** The user cares most about the *future* (Projections, Budgets), not the past. Historical data (Transactions) exists solely to inform future trajectory. Visual weight in dashboards must always prioritize the *Net Projection* and *Remaining Slush Fund*.
2.  **"High Data Density without Cognitive Overload":** Users need to see dozens of transactions or a full 12-month budget matrix simultaneously without scrolling forever. Use tight constraints (4px padding systems, tabular mono fonts, subtle background striping) to pack data elegantly. Hide edge-case actions behind clean Hover states or `...` Dropdowns rather than cluttering the default view with buttons.
3.  **"Frictionless Exception Handling":** Moving money or editing a category should feel instant. Drawers and Modals should slide in smoothly without losing the structural context of the background page. Validation must be instant, inline, and strictly informative—never accusatory.

---

## 1. Global Thematic Architecture (Semantic Token System)

### 1.1 Foundation & Base Layouts
*   **App Background Base:** 
    *   *Light Mode:* `bg-slate-50` (`#f8fafc`). The app background must never be pure white (`#ffffff`). Pure white is strictly reserved for elevated Card surfaces.
    *   *Dark Mode:* `bg-slate-950` (`#020617`).
*   **Glassmorphism Engine (Sticky/Floating surfaces):**
    *   Any element that scrolls over or sticks to the viewport (e.g. Top Navigation, Action Bar, Fixed Table Headers) must use EXACTLY `bg-white/80` (or `bg-slate-950/80` in dark context) combined with `backdrop-blur-md` (12px blur filter). It must have a boundary border of `border-slate-200`.
*   **Grid System & Breakpoint Constraints:**
    *   `sm`: 640px | `md`: 768px | `lg`: 1024px | `xl`: 1280px | `2xl`: 1536px.
    *   The primary layout wrapper must be constrained: `max-w-7xl mx-auto`.
    *   Padding rules for root containers: `px-4 sm:px-6 lg:px-8`.
    *   Component gap spacing: `gap-6` (24px) is the standard for dashboard metrics. `gap-4` (16px) for inner-card elements.

### 1.2 Spacing & Padding Primitives (The `4px` Guideline)
MiBudget uses a strict 4px grid system via Tailwind. NEVER use arbitrary values (e.g., `px-[17px]`).
*   **Cards/Panels (Internal Padding):** `p-6` (24px) for desktop; `p-4` (16px) for mobile breakpoints.
*   **Buttons:** `px-4 py-2` (Width fluid or intrinsic, Height strictly 40px, `h-10`).
*   **Form Inputs:** `px-3 py-2` (Height strictly 40px, `h-10`).
*   **Table Cells:** `px-4 py-3` with an explicit `h-12` minimum height.
*   **Section Gaps:** `space-y-8` (32px) between major vertical page components. `space-y-4` (16px) between grouped internal elements.

### 1.3 Strict Z-Index Layering Matrix
To prevent overlap collisions between dropdowns, sticky headers, and modals, the stacking context is strictly controlled:
*   `z-0`: Base content (cards, charts, table bodies).
*   `z-10`: Sticky headers inside components (e.g., table headers `<th>`).
*   `z-20`: Floating action buttons (FABs) or sticky page-level action bars.
*   `z-30`: Dropdown menus, Popovers, Select dropdowns, Tooltips.
*   `z-40`: Application top navigation header (mobile menu triggers).
*   `z-50`: Overlays, Modals, Dialogs, Drawers (includes the backdrop `bg-slate-900/40`).
*   `z-[100]`: Toasts and global alerts.

---

## 2. Deep Component Anatomies & Interaction States

### 2.1 Buttons (Standardization Protocol)
All buttons must implement Shadcn UI primitives with exactly `rounded-md` corners (6px). Transition duration: `duration-200`.
*   **Primary Button (`variant="default"`):** 
    *   Base: `bg-blue-600 text-white shadow-sm`.
    *   Hover: `hover:bg-blue-700 hover:shadow-md`.
    *   Active: `active:bg-blue-800 active:scale-[0.98] transition-all`.
    *   Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`.
*   **Secondary/Outline (`variant="outline"`):** 
    *   Base: `bg-white border border-slate-300 text-slate-700 shadow-sm`.
    *   Hover: `hover:bg-slate-50 hover:text-slate-900`.
*   **Destructive (`variant="destructive"`):** 
    *   Base: `bg-rose-600 text-white shadow-sm`.
    *   Hover: `hover:bg-rose-700`.
*   **Ghost (`variant="ghost"`):** 
    *   Base: `bg-transparent text-slate-700`.
    *   Hover: `hover:bg-slate-100 hover:text-slate-900`.
*   **Loading State (ALL Buttons):** Must disable interaction. Render `lucide-react/Loader2` with an `animate-spin` class horizontally adjacent (left) of the text. E.g., `<Loader2 className="mr-2 h-4 w-4 animate-spin" />`.

### 2.2 Form Inputs, Controls, & Validation
Forms must look clean; the validation state must be highly visible without overwhelming the design.
*   **Container Width:** `w-full` for standard forms (Modals/Drawers).
*   **Labels:** `block text-sm font-medium text-slate-700 mb-1.5` (6px bottom margin). Required fields must append a red asterisk `<span className="text-rose-500">*</span>`.
*   **Input Fields (`input`, `select`, `textarea`):**
    *   Base: `bg-white border border-slate-300 rounded-md shadow-sm text-sm text-slate-900`.
    *   Padding/Height: `px-3 py-2 h-10` (Textarea: `min-h-[80px] py-2`).
    *   Transition rules: `transition duration-150 ease-in-out`.
    *   Focus Rules: `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`.
    *   Placeholder: `placeholder:text-slate-400`.
    *   Disabled: `disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`.
*   **Validation Error State:**
    *   Input border turns Red: `border-rose-500 focus:ring-rose-500`.
    *   Message below input: `text-xs text-rose-500 mt-1 flex items-center gap-1`. Always prefix with `<AlertCircle className="w-3 h-3" />`.

### 2.3 Status Badges / Pills (Visual Signifiers)
Status handled visually via pills. All pills are composed as follows:
`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border`.
*   **Complete:** `bg-emerald-50 text-emerald-700 border-emerald-200`.
*   **Pending (Bank Sync):** `bg-slate-100 text-slate-700 border-slate-300`.
*   **Pending Reconciliation (Action Required):** `bg-amber-100 text-amber-800 border-amber-300 relative`. If in "Validation Mode", append an absolute ping indicator: `<span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>`.
*   **Excluded:** `bg-rose-50 text-rose-700 border-rose-200 line-through opacity-70`.

### 2.4 Data Tables (The Transaction Core)
The grid that holds transactions must be perfectly aligned and responsive.
*   **Table Container:** 
    *   Wrapper: `border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white relative`.
    *   Scrolling: Horizontal overflow on mobile `w-full overflow-auto`.
*   **Headers (`<th>`):**
    *   Background: `bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10`.
    *   Typography: `text-left text-xs font-semibold text-slate-500 uppercase tracking-wider p-4 border-b border-slate-200`.
*   **Rows (`<tr>`):**
    *   Behavior: `hover:bg-blue-50/40 transition-colors group border-b border-slate-100 last:border-b-0`.
*   **Cells (`<td>`):** `p-4 text-sm text-slate-700 whitespace-nowrap`.
*   **Amount Column (Strict Rule):** 
    *   Alignment: `text-right font-mono pr-6`.
    *   Income Styling: `text-emerald-600 font-medium` (prefix with `+`).
    *   Expense Styling: `text-slate-900`.
*   **Empty State Validation:** 
    *   `h-64 flex flex-col items-center justify-center text-center space-y-4`.
    *   Faded icon: `<Inbox className="w-12 h-12 text-slate-300" />`.
    *   Text: `<p className="text-slate-500 font-medium">No transactions match these criteria</p>`.

### 2.5 Overlays (Modals, Dialogs, Drawers)
All overlay architectures must conform to Shadcn's primitive rules (`Dialog`, `Sheet`), guaranteeing 100% strict accessibility (focus-traps, ESC key closure, outside-click closure).
*   **Backdrop/Overlay Backdrop:** `fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0`.
*   **Modal Container (e.g., Export Data, Split Transaction):**
    *   Position: `fixed left-[50%] top-[50%] z-50 shadow-xl overflow-hidden`.
    *   Transform: `translate-x-[-50%] translate-y-[-50%]`.
    *   Base styling: `w-full max-w-lg bg-white rounded-xl border border-slate-200`.
    *   Animation: `data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-200`.
    *   Header: `bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center`.
    *   Body: `p-6 overflow-y-auto max-h-[70vh]`.
    *   Footer: `bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3`.
*   **Drawer Container (e.g., Edit Transaction details):**
    *   Position: `fixed z-50 bg-white shadow-2xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300`.
    *   Placement: `inset-y-0 right-0 h-full border-l sm:max-w-md w-full sm:w-[400px] flex flex-col`.
    *   Header: `px-6 py-4 border-b`.
    *   Scrollable Content: `flex-1 overflow-y-auto p-6 space-y-6`.
    *   Footer Action Bar: Absolute mandatory sticky position at the bottom of the drawer (`sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3 shrink-0`). Cancel is Outline. Save is Primary.

### 2.6 Interactive Charts (Recharts Customization Rules)
*   **Curved Area Line Constraints:** `type="monotone"` is mandatory for rendering fluid, anti-aliased financial curves.
*   **Area Chart Fills:** Use standard SVG `<defs>` to `linearGradient` the fill vertically.
    *   Stop 1 (Top, `offset="5%"`): `stopColor="#2563eb" stopOpacity={0.25}`.
    *   Stop 2 (Bottom, `offset="95%"`): `stopColor="#2563eb" stopOpacity={0}`.
*   **Net Balance Stroke:** `stroke="#2563eb" strokeWidth={3}` (Thick, highly visible anchor point). Active Dot: `r={6} strokeWidth={0} fill="#1d4ed8"`.
*   **Grid Lines:** `<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />`.
*   **Axes Text:** `<XAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickMargin={10} />`.
*   **Responsive Container:** Must be wrapped in `<ResponsiveContainer width="100%" height="100%">` inside a specific explicit pixel-height container wrapper (e.g., `h-[400px]`).
*   **Hover Tooltip Wrapper:** 
    *   Must be a custom HTML component returning a div: `bg-white p-3 rounded-lg shadow-xl border border-slate-200`.
    *   Data inside the tooltip must align values perfectly right and labels perfectly left using flexbox (`justify-between gap-4`).
    *   Data formatting inside tooltip must match the `<Typography Numeric Standard>` explicitly (`font-mono`).

---

## 3. Explicit Flow Requirements & Edge Case Behaviors

### 3.1 Date Selection & Filtering
*   Popovers containing Calendars (e.g., `<Calendar />` inside a `<PopoverContent />`) must drop down with `align="start"` to avoid expanding the viewport width.
*   Calendar selected active day: `bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600`.
*   Calendar active month/year dropdowns: Native `<select>` hidden within styled buttons, or explicitly styled `Select` primitives.

### 3.2 Projections Cell Highlighting
If a specific projection row month (e.g., "Housing Expense in July") deviates structurally from the default generic baseline (due to a manual scenario override or planned one-off), the UI table cell `<td>` rendering that distinct number MUST immediately adopt a distinct visual styling to map out the variance:
*   Add class: `bg-amber-100 font-bold text-amber-900 border-x border-amber-200 transition-colors duration-300`.
*   Ensure the surrounding sequential `<tr>` background hover rules do not aggressively override this explicit cell background color.

### 3.3 The "Add Transaction" Fallback State
If a user forces the 'Configure Rule Engine' dialog and attempts to set a Sub-Category but standard mapping structurally breaks, the UI must definitively and safely fallback to "Always Ask". 
*   It MUST NEVER default to null or an empty string visually. 
*   The HTML `<select>` option `value=""` must map visually to the string `"Always Ask"` in the UI.

### 3.4 Card Skeletons & Loading States
When fetching the primary queries (e.g., Supabase transaction lists, projection generation algorithms), the UI must instantly paint the layout skeleton.
*   Cards: Render empty containers identical to the final Card shape.
*   Title: Render `<div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />`.
*   Data points: Render `<div className="h-10 w-48 bg-slate-200 rounded animate-pulse mt-4" />`.
*   Table logic: Render 5 to 10 rows of skeletons mirroring the column widths perfectly.

---

## 4. Typography Scale Matrix (Font Family: Inter)
Typography actively establishes the visual hierarchy. We strictly map to these Tailwind structural tokens:
*   **Display 1 (Splash/Marketing only):** `text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900`.
*   **Header 1 (Page Overviews):** `text-3xl font-bold tracking-tight text-slate-900 leading-tight`.
*   **Header 2 (Section/Card Title):** `text-xl font-semibold tracking-tight text-slate-800`.
*   **Header 3 (Modal Headers):** `text-lg font-medium text-slate-800`.
*   **Value/Metric Massive:** `text-3xl font-bold text-slate-900 font-mono tracking-tighter`.
*   **Body (Primary Data):** `text-sm font-normal text-slate-700 leading-6`.
*   **Body (Muted/Hints):** `text-sm text-slate-500 leading-relaxed`.
*   **Microcopy/Labels:** `text-xs font-medium text-slate-500 uppercase tracking-wider`.
*   **Numeric Standard (Currency & Tables):** ALL numbers (`amounts`, `dates`, `percentages`) must be styled with `font-mono tracking-tighter` to guarantee tabular lining and vertical decimal alignments.

---

## 5. Immediate Defect Audit Checklist (Stitch Ingestion Target)
The following visual/interaction inconsistencies MUST be addressed by Stitch immediately upon parsing this matrix against the provided `screenshots` directory. They represent identified regressions in the current build:

1.  **Radius Mismatches:** Inspect all CTA buttons (e.g., `Add Transaction`, `Save Profile`, `Export`). They must all strictly conform to `rounded-md`. Eliminate any rogue instances of `rounded-none`, `rounded-sm`, or the legacy `rounded-lg` bloat (except for Pills).
2.  **Elevation Parity:** Ensure the "Validation Overlay Card" `box-shadow` precisely equates to the "Login Card" `box-shadow`. (`shadow-sm` vs `shadow-lg`). Central/floating focal points must use standard `shadow-lg`.
3.  **LocalLogin Alignment:** The `LocalLogin.tsx` bypass must mimic the identical gradient geometry, spacing, and center alignment of the default `SignInScreen.tsx`. Legacy `bg-gray-50` full-screen backgrounds acting solely as color blocks are strictly forbidden.
4.  **Transaction Detail Drawer Bar Alignment:** The Cancel button in the drawer footer occasionally drops to unstyled raw text. It must be strictly rendered as a `<Button variant="outline">` and align vertically center (`items-center`) with the Save button at the far right of the sticky footer wrapper.

**END OF SPECIFICATION**
[STITCH INGESTION PROTOCOL: ACTIVE]
