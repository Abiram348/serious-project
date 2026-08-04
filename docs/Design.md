# SwarmDev — Design Document

> **Version:** 1.0  
> **Last updated:** 2026-06-13  
> **Owner:** SwarmDev Core Team  
> **Status:** Active

---

## 1. Design Philosophy

SwarmDev's visual identity balances **developer professionalism** with **AI futurism**. The interface should feel like a premium IDE — dark, focused, information-dense — while signaling the magic of autonomous agent collaboration through subtle motion, color-coded agent identities, and real-time feedback.

**Principles:**
1. **Information density over whitespace** — developers want to see files, logs, chat, and preview simultaneously.
2. **Color is functional** — every hue communicates state (agent type, status, severity).
3. **Motion is informative** — animations indicate progress, not decoration.
4. **Dark mode first** — the editor is always dark; light mode reserved for marketing pages only.

---

## 2. Design Tokens

### 2.1 Color Palette

#### Base (Dark Theme — Editor)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#0A0A0A` | App background |
| `--bg-surface` | `#141414` | Panels, cards, sidebars |
| `--bg-elevated` | `#1E1E1E` | Inputs, dropdowns, hover states |
| `--bg-overlay` | `#262626` | Modals, tooltips, menus |
| `--border-default` | `#2A2A2A` | Dividers, panel borders |
| `--border-focus` | `#3A3A3A` | Focused elements |
| `--text-primary` | `#E5E5E5` | Headings, primary content |
| `--text-secondary` | `#A1A1AA` | Labels, metadata |
| `--text-muted` | `#71717A` | Disabled, timestamps |
| `--text-inverse` | `#0A0A0A` | Text on accent backgrounds |

#### Accents (Agent Identity + Status)

| Agent | Color | Hex | Usage |
|-------|-------|-----|-------|
| **Supervisor** | Purple | `#A855F7` | Task plan badge, orchestration lines |
| **Backend** | Blue | `#3B82F6` | API routes, server files |
| **Database** | Emerald | `#10B981` | Schema, migrations, SQL |
| **DevOps** | Orange | `#F97316` | Docker, K8s, infra files |
| **Frontend** | Sky | `#0EA5E9` | React components, pages |
| **QA** | Yellow | `#EAB308` | Test files, assertions |
| **Reviewer** | Indigo | `#6366F1` | Review comments, diffs |
| **Security** | Red | `#EF4444` | Audit warnings, fixes |
| **Documentation** | Teal | `#14B8A6` | Markdown, README |

#### Semantic

| State | Color | Hex |
|-------|-------|-----|
| Success | Green | `#22C55E` |
| Warning | Amber | `#F59E0B` |
| Error | Red | `#EF4444` |
| Info | Blue | `#3B82F6` |
| Running | Cyan pulse | `#06B6D4` |

### 2.2 Typography

| Role | Font | Size | Weight | Line Height |
|------|------|------|--------|-------------|
| **Display** | Inter | 48px | 700 | 1.1 |
| **H1** | Inter | 32px | 600 | 1.2 |
| **H2** | Inter | 24px | 600 | 1.3 |
| **H3** | Inter | 18px | 600 | 1.4 |
| **Body** | Inter | 14px | 400 | 1.5 |
| **Code** | JetBrains Mono | 13px | 400 | 1.6 |
| **Small** | Inter | 12px | 400 | 1.4 |
| **Label** | Inter | 11px | 500 | 1.2 (uppercase, tracking wide) |

### 2.3 Spacing Scale

Based on 4px grid:

| Token | Value |
|-------|-------|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |

### 2.4 Shadows & Elevation

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Buttons, inputs |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.4)` | Cards, dropdowns |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.5)` | Modals, popovers |
| `shadow-glow-{color}` | `0 0 12px {color}40` | Running agents, focus rings |

### 2.5 Radii

| Token | Value |
|-------|-------|
| `radius-sm` | 4px (buttons, inputs) |
| `radius-md` | 6px (cards, panels) |
| `radius-lg` | 8px (modals) |
| `radius-full` | 9999px (pills, avatars) |

---

## 3. Component Design

### 3.1 AppHeader

```
┌─────────────────────────────────────────────────────────────────────┐
│ ◀ Projects    SwarmDev    ● Supervisor ● Backend ● Database ...   👤│
│              (logo)       (agent status bar — compact dots)         │
└─────────────────────────────────────────────────────────────────────┘
Height: 48px
Background: bg-surface
Border-bottom: 1px solid border-default
```

**Agent Status Dot:**
- `IDLE` — gray outline only
- `RUNNING` — solid color + subtle pulse animation (box-shadow glow)
- `COMPLETED` — solid color + check micro-icon
- `FAILED` — solid red + cross micro-icon

### 3.2 FileTree

```
┌────────────┐
│ 📁 src     │
│   📁 app   │
│     📄 page.tsx     ← selected: bg-elevated + left border accent
│     📄 layout.tsx   ← agent color dot (e.g., blue for Backend)
│   📁 components│
│     📄 Button.tsx   ← yellow dot (QA generated)
│ 📄 package.json     ← teal dot (Documentation)
└────────────┘
Width: 250px
Background: bg-surface
Font: code (13px)
Indent: 12px per level
Selected: left 2px accent border + bg-elevated
Hover: bg-elevated
```

**File icon color coding:**
- Dot before filename indicates `createdBy` agent.
- Hover tooltip shows: `Created by {agentType} • {timestamp}`.

### 3.3 Monaco Editor Theme

Custom theme "SwarmDev Dark" derived from VS Code Dark+:

| Token | Color |
|-------|-------|
| Background | `#0A0A0A` |
| Current line | `#1E1E1E` |
| Selection | `#264F78` |
| Comment | `#6A9955` |
| Keyword | `#569CD6` |
| String | `#CE9178` |
| Function | `#DCDCAA` |
| Variable | `#9CDCFE` |
| Type | `#4EC9B0` |
| Number | `#B5CEA8` |

### 3.4 Terminal Panel

```
┌────────────────────────────────────────┐
│ Terminal │ Build │ Preview           [▲]│
├────────────────────────────────────────┤
│ [14:32:01] frontend: Generating pages  │
│ [14:32:02] frontend: ✓ page.tsx        │
│ [14:32:03] qa: Running tests...        │
│ [14:32:05] qa: ⚠ 1 warning in auth.ts  │
│                                        │
│ $ npm run build                        │
│ > Build succeeded                      │
└────────────────────────────────────────┘
Background: bg-base
Font: JetBrains Mono 13px
Line height: 1.6
Timestamp: text-muted
Agent name: agent accent color
Level badges: INFO (blue), WARN (amber), ERROR (red)
```

### 3.5 Chat Panel

```
┌────────────────────────────────┐
│ Chat                    [─] [×]│
├────────────────────────────────┤
│                                │
│ ┌────────────────────────────┐ │
│ │ 👤 Make the button blue  │ │  ← User message
│ └────────────────────────────┘ │
│                                │
│ ┌────────────────────────────┐ │
│ │ 🤖 frontend (codellama)   │ │  ← Agent message
│ │ Sure. I've updated...      │ │
│ │ [View diff] [Apply]        │ │
│ └────────────────────────────┘ │
│                                │
├────────────────────────────────┤
│ @frontend  Type a message... │
│ [Send]                         │
└────────────────────────────────┘
Width: 320px
Background: bg-surface
User bubble: bg-elevated, text-primary
Agent bubble: bg-base + 1px border agent-color
Input: bg-elevated, radius-md, focus: border agent-color
```

**@mention autocomplete:**
- Typing `@` shows dropdown with agent avatars + colors.
- Selected mention is pill-shaped with agent color background.

### 3.6 Agent Status Bar (Expanded)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                      [⚙] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐        │
│  │   🤖    │───►│   🤖    │───►│   🤖    │───►│   🤖    │        │
│  │Supervisor│    │ Backend│    │Database │    │ DevOps  │        │
│  │  ✅     │    │  🔄    │    │  ✅     │    │  ⏳     │        │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘        │
│       │                                                           │
│       └────────────┬────────────┐                                 │
│                    ▼            ▼                                 │
│              ┌─────────┐  ┌─────────┐                            │
│              │ Frontend│  │   QA    │                            │
│              │  ⏳     │  │  ⏳     │                            │
│              └─────────┘  └─────────┘                            │
│                                                                     │
│  Legend: ✅ Completed  🔄 Running  ⏳ Idle  ❌ Failed             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Shown on dashboard project card hover or as a dedicated view in the editor header.

---

## 4. Layout Principles

### 4.1 Editor Layout (IDE-style)

```
┌─────────────────────────────────────────────────────────────────┐
│ AppHeader (48px)                                                │
├──────────┬──────────────────────────────┬──────────┬──────────────┤
│ FileTree │                            │  Chat    │              │
│ (250px)  │      Monaco Editor          │ (320px) │  Settings   │
│          │      (flex: 1)              │         │  (drawer)   │
│          │                            │         │              │
│          │                            │         │              │
├──────────┴──────────────────────────────┴──────────┴──────────────┤
│ Terminal Panel (200px, resizable, collapsible)                  │
└─────────────────────────────────────────────────────────────────┘
```

- **Resizable panels** via `react-resizable-panels` with persistence in `localStorage`.
- **Collapsible** sidebars and bottom panel (chevron toggle).
- **Min widths:** FileTree 200px, Chat 280px, Terminal 120px.

### 4.2 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ AppHeader (simplified)                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  My Projects                                          [+ New]   │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 📁 E-com    │  │ 📁 Blog     │  │  + Empty    │             │
│  │ Next.js     │  │ Next.js     │  │   slot      │             │
│  │ 3/9 agents  │  │ Completed   │  │   (CTA)     │             │
│  │ [Open]      │  │ [Open]      │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  Usage: 1.2M / 2M tokens              [Upgrade to Team]        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Landing Page Layout (Light Mode Exception)

```
┌─────────────────────────────────────────────────────────────────┐
│  Logo    Features  Pricing   [Sign In] [Get Started]            │ ← sticky
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         Describe your app. Our AI swarm builds it.                │
│         You watch, chat, and ship.                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  A Next.js dashboard for inventory management...        │   │
│  │                                                         │   │
│  │              [⚡ Start Building — Free]                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │   🤖    │ │   🤖    │ │   🤖    │ │   🤖    │ │   🤖    │   │
│  │Backend  │ │Database│ │ DevOps │ │Frontend│ │   QA    │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Footer                                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Light theme tokens (landing only):**
- Background: `#FAFAFA`
- Surface: `#FFFFFF`
- Text: `#18181B`
- Accent: same purple/blue palette

---

## 5. Animation & Motion

### 5.1 Agent Activity Indicators

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Running agent dot | Pulse glow (box-shadow scale) | 2s infinite | ease-in-out |
| File created in tree | Slide down + fade in | 300ms | ease-out |
| File updated dot | Brief flash (opacity 0→1→0.5) | 500ms | ease-out |
| Terminal text append | None (instant for performance) | — | — |
| Chat message appear | Slide up + fade in | 250ms | ease-out |
| Panel collapse | Height transition | 200ms | ease-in-out |
| Modal open | Scale 0.95→1 + fade | 200ms | ease-out |
| Toast slide in | Slide from right + fade | 300ms | ease-out |

### 5.2 DAG Visualization (Dashboard)

When a project is running, the dashboard card shows a mini DAG:

```
Supervisor ──► [Backend] ──► Frontend ──► QA ──► ...
                  │
               [Database]
```

- Nodes fill with agent color as they complete.
- Active node has pulse ring.
- Failed node turns red and stops the chain animation.

### 5.3 Loading States

| State | Visual |
|-------|--------|
| Page loading (SSR) | Skeleton screens matching layout shape |
| File loading | Monaco shows "Loading..." centered |
| Agent waiting | Spinner inside agent badge |
| Chat sending | Input disabled + spinner in send button |
| Save file | Brief "Saving..." text in status bar |

---

## 6. Responsive Behavior

SwarmDev is **desktop-first** — the editor requires a large screen. However, landing and dashboard have breakpoints:

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| `sm` | 640px | Landing: single column hero; Dashboard: 1 project card per row |
| `md` | 768px | Landing: 2-column features; Dashboard: 2 cards per row |
| `lg` | 1024px | Full editor layout enabled; Dashboard: 3 cards |
| `xl` | 1280px | Max content width 1200px centered |

**Editor on < 1024px:**
- FileTree collapses to hamburger menu.
- Chat becomes bottom sheet (swipe up).
- Terminal becomes full-screen overlay.
- Monaco editor remains primary view.

---

## 7. Iconography

| Icon | Library | Usage |
|------|---------|-------|
| File/folder | `lucide-react` | FileTree |
| Agent avatars | Custom SVG | Agent status bar, chat |
| Status | `lucide-react` | Check, X, spinner, alert |
| Actions | `lucide-react` | Send, save, delete, settings |
| Tech stack | Custom SVG | Project cards (Next.js, Express, etc.) |

**Agent Avatar SVGs:**
- 24×24px, monochrome line art.
- Stroke color = agent accent color.
- Each agent has a unique abstract shape (e.g., Backend = server rack, Database = cylinder, Frontend = browser window).

---

## 8. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Color contrast | All text ≥ 4.5:1 against background (WCAG AA) |
| Focus indicators | 2px outline in `--border-focus` on all interactive elements |
| Keyboard nav | FileTree: arrow keys; Editor: standard Monaco; Chat: Tab/Enter |
| Screen reader | Agent status read as "Backend agent, running"; file tree announces selections |
| Reduced motion | `@media (prefers-reduced-motion)` disables pulse animations; instant transitions |
| Alt text | All agent avatars have `aria-label="{agentType} agent, {status}"` |

---

*End of Design.md*
