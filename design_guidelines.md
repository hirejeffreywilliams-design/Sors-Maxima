# Design Guidelines: Sports Betting Parlay Optimizer

## Design Approach

**System Selected:** Design System Approach inspired by modern analytics platforms (Linear, Stripe Dashboard, Bloomberg Terminal)

**Rationale:** This is a data-intensive, utility-focused application where information clarity, rapid decision-making, and analytical precision are paramount. Users need to quickly scan odds, probabilities, and optimization results. The design should prioritize information density without overwhelming, fast visual scanning, and confident action-taking.

**Core Principles:**
- Data-first hierarchy: Numbers and statistics are the hero
- Ruthless clarity: Every element serves the analysis
- Speed of comprehension: Users should grasp complex data instantly
- Confident decisions: Clear CTAs that inspire trust

---

## Typography

**Font Stack:**
- Primary: Inter (via Google Fonts) - numbers at sizes: 3xl, 2xl, xl, lg, base, sm
- Monospace: JetBrains Mono - for odds display and statistical values

**Hierarchy:**
- Page titles: text-3xl font-bold
- Section headers: text-xl font-semibold
- Data labels: text-sm font-medium uppercase tracking-wide
- Primary numbers (odds/probabilities): text-2xl font-bold font-mono
- Secondary data: text-base font-mono
- Body text: text-base
- Helper text: text-sm text-opacity-70

---

## Layout System

**Spacing Primitives:** Consistent use of Tailwind units: **2, 4, 6, 8, 12, 16**
- Component padding: p-6
- Section spacing: space-y-8
- Card spacing: p-4 or p-6
- Element gaps: gap-4
- Page margins: px-8 py-6

**Container Strategy:**
- Dashboard: max-w-screen-2xl mx-auto
- Modals/Forms: max-w-2xl
- Data tables: full-width with horizontal scroll

---

## Component Library

### Navigation
**Top Navigation Bar:** Fixed header with logo, main nav links, user profile
- Height: h-16
- Horizontal padding: px-8
- Links spaced: gap-6

### Dashboard Layout
**Three-column grid:**
- Left sidebar (w-64): Quick actions, saved parlays
- Main area (flex-1): Active optimization workspace
- Right sidebar (w-80): Live odds feed, statistics summary

### Data Display Components

**Odds Card:**
- Container: rounded-lg border p-4
- Team names: text-base font-semibold
- Odds display: text-2xl font-mono font-bold
- Market type badge: rounded-full px-3 py-1 text-xs uppercase
- Implied probability: text-sm font-mono

**Parlay Builder:**
- Leg list: space-y-2
- Each leg: flex justify-between items-center p-3 rounded border
- Remove button: icon-only, right-aligned
- Add leg CTA: Full-width button at bottom

**Probability Results Panel:**
- Large probability display: text-4xl font-mono font-bold (center-aligned)
- Breakdown table: 3-column grid showing individual leg probabilities
- Confidence interval: text-sm with visual bar indicator
- Method indicator: text-xs badge (Monte Carlo vs Analytic)

**Optimization Results Table:**
- Fixed header with sortable columns
- Columns: Parlay Configuration | Win Prob | Expected Value | Kelly Stake | Potential Return
- Row height: h-12
- Alternating row treatment for readability
- Hover state for row selection
- "Build This Parlay" CTA button per row

### Forms

**Leg Input Form:**
- Grid layout: 2 columns on desktop, 1 on mobile
- Input fields: h-10, rounded-md, border, px-4
- Dropdown selects: Same styling as inputs
- Labels: text-sm font-medium mb-2
- Manual probability override: Slider with numeric input combo
- Submit button: Full-width on mobile, auto width on desktop

**Settings Panel:**
- Accordion-style sections
- Toggle switches for features
- Number inputs for simulation parameters
- Save button: sticky at bottom

### Action Components

**Primary CTA Buttons:**
- Height: h-11
- Padding: px-6
- Font: text-base font-semibold
- Rounded: rounded-lg

**Secondary Buttons:**
- Height: h-10
- Padding: px-5
- Font: text-sm font-medium
- Rounded: rounded-md

**Icon Buttons:**
- Size: w-10 h-10
- Rounded: rounded-full
- Icons via Heroicons (solid/outline)

### Data Visualization

**Correlation Matrix Heatmap:**
- Grid layout with leg labels
- Cell size: w-12 h-12
- Visual intensity indicator (not color-specific)
- Tooltip on hover with exact correlation value

**Probability Distribution Chart:**
- Simple bar chart showing win probability distribution
- Height: h-48
- Labels: text-xs

---

## Images

**Hero Section:** No large hero image - this is a dashboard application

**Empty States:**
- Illustration placeholders for "No parlays built yet" - simple line art icon centered
- "No odds available" state - data icon with helper text
- Size: w-24 h-24 centered in empty panels

**Team Logos (Optional Enhancement):**
- Small logos next to team names in odds cards
- Size: w-8 h-8 rounded-full
- Fallback: Team initials in circular badge

---

## Page Layouts

**Dashboard (Main View):**
- Full viewport height layout
- Three-panel grid as described above
- Sticky navigation
- Scrollable main content area

**Optimization Results Page:**
- Full-width table dominates
- Filters bar above: flex row with gap-4
- Pagination at bottom

**Authentication Pages:**
- Centered card: max-w-md mx-auto
- Minimal: Logo, form, link to alternate action
- Card padding: p-8
- Form spacing: space-y-6

**Backtest Results Page:**
- Chart at top: h-64
- Summary metrics: 4-column grid below chart
- Detailed results table below

---

## Accessibility & Interaction

- All interactive elements meet 44px touch target minimum
- Form validation shows inline beneath inputs
- Loading states: Skeleton screens for data tables, spinner for actions
- Toast notifications for success/error: Top-right corner, auto-dismiss
- Keyboard navigation: Focus rings on all interactive elements