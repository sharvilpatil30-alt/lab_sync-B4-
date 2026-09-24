# Campus Technology Platform Design System

**Smart Campus Lab & Resource Optimizer**  
*Document Version: 1.0.0*  
*Last Updated: 2026-09-23*  
*Scope: Reusable Component Library, Visual Tokens, and Interaction Guidelines*

---

## 1. Design Direction & Visual Identity

The Smart Campus Lab & Resource Optimizer is styled as an **institutional command platform** rather than a transient prototype. It strikes a balance between:
- **High Information Density**: Presenting critical academic and facility data efficiently without cognitive overload.
- **Deep Visual Hierarchy**: Restrained dark slate surfaces (`bg-slate-950`) combined with frosted glass panels (`glass-panel`), crisp borders (`border-slate-800`), and a single focused accent color (`indigo-500` / `indigo-600`).
- **Institutional Consistency**: Every page adheres to identical layout margins, card geometries, header breadcrumbs, table styling, and badge semantics. No page deviates into unstandardized visual styles.

---

## 2. Design Tokens

### Color Palette
- **Background Root**: `hsl(222.2, 84%, 4.9%)` (`#020617` / `slate-950`)
- **Card / Panel Surfaces**:
  - Panel (`glass-panel`): `rgba(15, 23, 42, 0.75)` with `backdrop-filter: blur(12px)` and `border: 1px solid rgba(255, 255, 255, 0.08)`
  - Sub-card (`glass-card`): `rgba(30, 41, 59, 0.55)` with `backdrop-filter: blur(8px)` and `border: 1px solid rgba(255, 255, 255, 0.06)`
- **Borders & Dividers**: `hsl(217.2, 32.6%, 18.5%)` (`slate-800` / `rgba(51, 65, 85, 0.6)`)
- **Primary Brand Accent**: `indigo-600` (`#4f46e5`) with glow `shadow-indigo-500/20`
- **Typography Colors**:
  - Heading & Primary: `slate-100` (`#f8fafc`)
  - Body & Content: `slate-300` (`#cbd5e1`)
  - Subtitle & Labels: `slate-400` (`#94a3b8`)
  - Dimmed / Footers: `slate-500` (`#64748b`)

### Semantic Status Tokens
Every status badge and indicator across labs, resources, and bookings maps deterministically to a fixed token:

| Domain | Status Value | Background / Border | Text Color | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Lab / Resource** | `available` | `bg-emerald-500/10 border-emerald-500/30` | `text-emerald-400` | Open for reservation or workstation lease |
| **Lab / Resource** | `occupied` / `in-use` | `bg-blue-500/10 border-blue-500/30` | `text-blue-400` | Currently running an active session |
| **Lab / Resource** | `maintenance` | `bg-amber-500/10 border-amber-500/30` | `text-amber-400` | Under active inspection or service |
| **Lab / Resource** | `offline` | `bg-rose-500/10 border-rose-500/30` | `text-rose-400` | Out of commission or decommissioned |
| **Booking** | `CONFIRMED` | `bg-emerald-500/10 border-emerald-500/30` | `text-emerald-400` | Scheduled and verified |
| **Booking** | `ACTIVE` | `bg-indigo-500/10 border-indigo-500/30` | `text-indigo-400` | Currently in-session inside facility |
| **Booking** | `QUEUED` | `bg-amber-500/10 border-amber-500/30` | `text-amber-400` | In priority queue awaiting lease |
| **Booking** | `PENDING` / `LEASED` | `bg-sky-500/10 border-sky-500/30` | `text-sky-400` | Processing validation |
| **Booking** | `COMPLETED` | `bg-slate-500/10 border-slate-500/30` | `text-slate-400` | Finished normally |
| **Booking** | `CANCELLED` / `REJECTED`| `bg-rose-500/10 border-rose-500/30` | `text-rose-400` | Terminated or rejected |

---

## 3. Reusable Component Inventory

All components are located in `frontend/src/components/common/` and exported via `index.ts`:

1. **`Button` (`Button.tsx`)**:
   - Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`.
   - Sizes: `sm`, `md`, `lg`.
   - Features: Integrated spinner on `isLoading`, `leftIcon`, `rightIcon`, micro-interaction scale on click (`active:scale-[0.98]`).
2. **`Card` (`Card.tsx`)**:
   - Primitives: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
   - Variants: `default`, `glass`, `interactive`, `outline`.
3. **`StatusBadge` (`StatusBadge.tsx`)**:
   - Fixed status-to-color mapping with pulsing dot indicators.
4. **`SystemHealthIndicator` (`SystemHealthIndicator.tsx`)**:
   - Live heartbeat beacon for backend `/api/v1/health` with measured ping latency and diagnostic popover.
5. **`Table` (`Table.tsx`)**:
   - Sortable columns, custom cell renderers, row click actions, integrated empty and loading states.
6. **`Modal` (`Modal.tsx`)**:
   - Centered dialog with backdrop blur, keyboard `Escape` handling, and focus retention.
7. **`ConfirmDialog` (`ConfirmDialog.tsx`)**:
   - Specialized destructive action prompt with custom confirm/cancel button labels and warnings.
8. **`Drawer` (`Drawer.tsx`)**:
   - Slide-over panel (`left` | `right`) for complex detail views, filters, and mobile drawer actions.
9. **`Tabs` (`Tabs.tsx`)**:
   - Primitives: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
   - Features: Active pill highlight, badges, accessible ARIA tablist roles.
10. **`Input` (`Input.tsx`)**:
    - Form field with icon adornments, validation error rendering, and focus rings.
11. **`Select` (`Select.tsx`)**:
    - Native and custom dropdown with helper text and error messaging.
12. **`DatePicker` (`DatePicker.tsx`)**:
    - Accessible calendar date selection input with min/max bounds.
13. **`Search` (`Search.tsx`)**:
    - Live search input with leading icon, debounce support, and quick clear button.
14. **`Filters` (`Filters.tsx`)**:
    - Filter toolbar with active chip tags, tag removal, and bulk reset button.
15. **`Pagination` (`Pagination.tsx`)**:
    - Accessible page numbers, next/prev controls, and items-per-page selector.
16. **`Skeleton` (`Skeleton.tsx`)**:
    - Polished shimmer loading placeholder matching card and table geometries.
17. **`Spinner` (`Spinner.tsx`)**:
    - SVG rotating indicator for inline actions and loading buttons.
18. **`EmptyState` (`EmptyState.tsx`)**:
    - Reusable empty view with icon, title, descriptive copy, and optional action button.
19. **`ErrorMessage` (`ErrorMessage.tsx`)**:
    - Error container with retry button for failed TanStack Query fetches.
20. **`Toast` (`Toast.tsx`)**:
    - Centralized toast context provider supporting `success`, `error`, `warning`, and `info`.
21. **`Breadcrumbs` (`Breadcrumbs.tsx`)**:
    - Role-aware hierarchical path trail for quick navigation.

---

## 4. Typography Scale & Layout Guidelines

- **H1 (Page Title)**: `text-2xl sm:text-3xl font-extrabold text-white tracking-tight`
- **H2 (Section Header)**: `text-lg sm:text-xl font-bold text-white tracking-tight`
- **H3 (Card Header)**: `text-sm sm:text-base font-bold text-slate-200`
- **Body Regular**: `text-xs sm:text-sm text-slate-300 leading-relaxed`
- **Mono / IDs**: `font-mono text-xs text-indigo-400 font-semibold`
- **Container Sizing**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`

---

## 5. Verification
- All 22 common components build cleanly with 0 TypeScript and ESLint errors.
- Unified styling across Student, Faculty, and Admin portals eliminates fragmented UI styles.
