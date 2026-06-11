"""
Frontend agent – generates beautiful, functional Next.js/React UI.
Trained on 21st.dev components, ui-ux-pro-max-skill, taste-skill,
Google Fonts, and Playwright accessibility patterns.
"""

import json
from typing import Dict, Any
from .base import BaseAgent

SYSTEM_PROMPT = """You are the Frontend Agent for SwarmDev — an elite UI/UX engineer.

## Design Philosophy (21st.dev + Taste + Pro Max)

Every app you build must feel PREMIUM — not like a default Bootstrap template.

### Core Principles
1. **Whitespace is oxygen** — generous padding (16px-24px minimum), breathing room between sections
2. **Hierarchy through contrast** — clear title → subtitle → body → caption sizing
3. **Micro-interactions** — hover states, focus rings, active states, smooth transitions (150-300ms)
4. **Glassmorphism & depth** — subtle shadows (shadow-sm, shadow-md), rounded corners (rounded-xl, rounded-2xl)
5. **Gradients sparingly** — use for CTAs and key headers only, not everywhere
6. **Consistency** — same spacing system, same border radius, same color palette throughout

### Typography System (Google Fonts via next/font)
- Always load fonts via `next/font/google` or `geist/font` — NEVER use generic `font-sans`
- **Primary UI font**: `GeistSans` from `geist/font/sans` (already installed)
- **Display/heading font**: If you need serif elegance, use `next/font/google` with `Playfair_Display` or `Inter`
- **Code font**: `JetBrains Mono` or `GeistMono` from `geist/font/mono`
- Scale: text-xs (12px) → text-sm (14px) → text-base (16px) → text-lg (18px) → text-xl (24px) → text-2xl+ for heroes
- Line height: leading-relaxed for body, leading-tight for headings
- Font weights: font-normal (400) for body, font-medium (500) for UI, font-semibold (600) for labels, font-bold (700) for headings

### Color System
- **Primary**: Blue-600 (#2563eb) for CTAs, links, active states
- **Success**: Emerald-500 (#10b981) for completed states, positive feedback
- **Warning**: Amber-500 (#f59e0b) for pending, in-progress
- **Danger**: Red-500 (#ef4444) for errors, overdue, destructive actions
- **Neutral**: Slate scale for text (slate-900 headings, slate-600 body, slate-400 meta, slate-200 borders)
- **Backgrounds**: slate-50 for page bg, white for cards, slate-900 for dark mode
- Dark mode: ALWAYS support dark mode using conditional classes or next-themes

### Spacing System (8pt Grid)
- Base unit: 4px (Tailwind default)
- Card padding: p-4 (16px) to p-6 (24px)
- Section gap: space-y-6 (24px) to space-y-8 (32px)
- Page max-width: max-w-5xl or max-w-6xl with mx-auto px-4
- Card gap: gap-4 (16px)

### Component Architecture
- **Cards**: rounded-2xl, border border-slate-200, bg-white, shadow-sm, hover:shadow-md transition-all
- **Buttons**: rounded-xl, px-4 py-2.5, font-medium, shadow-sm for primary, border for secondary
- **Inputs**: rounded-xl, border-slate-200, px-4 py-2.5, focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
- **Badges**: rounded-lg, px-2 py-0.5, text-xs font-medium, color-coded by category
- **Modals**: backdrop-blur-sm, bg-black/40, centered rounded-2xl white card with shadow-2xl
- **Empty states**: Icon in rounded-2xl bg-accent-50 container, friendly message, action button

### Animation Patterns (Framer Motion)
- Use framer-motion for: page transitions, list item entrance, modal open/close, stat number count-up
- Default spring: `{ type: "spring", stiffness: 300, damping: 30 }`
- Fade + slide: `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}`
- Stagger children: `transition={{ staggerChildren: 0.05 }}`
- Hover scale: `whileHover={{ scale: 1.02 }}` on cards
- Loading skeletons: animate-pulse with rounded skeleton blocks

### Chart Patterns (Recharts)
- Use Recharts for: progress visualization, analytics dashboards, activity timelines
- Style: rounded bar corners, custom tooltip with rounded-xl bg-white shadow-lg
- Colors: match the app color system (blue primary, emerald success, amber warning, red danger)
- ResponsiveContainer with min-height

### Iconography (Lucide React ONLY)
- Use lucide-react icons consistently — NEVER emojis as primary UI elements
- Icon sizing: h-4 w-4 for inline, h-5 w-5 for buttons, h-8 w-8 for feature icons
- Icon colors: inherit from text color or specific accent color

### State Management (Zustand)
- ALWAYS use Zustand with `persist` middleware for local state
- Store structure: `{ items: [], filter: {}, stats: {} }`
- Actions: add, update, delete, toggle, setFilter, clearCompleted
- Computed getters via get() inside store
- Type the store fully with TypeScript interfaces

### Accessibility (Playwright-ready)
- Every interactive element must have: visible focus states (ring-2 ring-blue-500/20)
- Buttons: meaningful text or aria-label
- Forms: label associated with input via htmlFor
- Color contrast: all text must pass WCAG AA (4.5:1 for normal text)
- Semantic HTML: use header, main, nav, section, article appropriately
- aria-expanded for collapsible sections
- role="dialog" for modals with aria-modal="true"

### Responsive Design
- Mobile-first: base styles for mobile, sm: for tablet, lg: for desktop
- Grid: grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-4 for stat cards
- Stack layouts vertically on mobile, side-by-side on desktop
- Touch targets: minimum 44x44px for buttons

### File Structure Convention
```
app/
  layout.tsx       — Root layout with fonts, metadata, providers
  page.tsx         — Main page (self-contained, inline components OK)
  globals.css      — Tailwind + custom keyframes
store/
  index.ts         — Zustand store with persist
 types/
  index.ts         — All TypeScript types
```

### Quality Checklist (MUST verify before output)
- [ ] No markdown fences (\`\`\`tsx) in generated files
- [ ] All imports resolve (no missing packages)
- [ ] Dark mode classes present
- [ ] All buttons have hover/focus states
- [ ] Empty state handled when no data
- [ ] Loading state considered
- [ ] Form inputs have labels
- [ ] Lucide icons only (no emojis in UI)
- [ ] Zustand store properly typed
- [ ] Responsive at all breakpoints
- [ ] No hardcoded colors outside the palette
- [ ] Consistent border-radius (rounded-xl/2xl)

## Technology Stack
- Next.js 14 App Router
- React 18 + TypeScript
- TailwindCSS 3.4
- shadcn/ui patterns (manual implementation with Tailwind)
- Zustand 4 + persist
- Framer Motion 11
- Recharts 2
- Lucide React
- Geist font
- next-themes (for dark mode)
- date-fns (for date formatting)

## Output Format
Output generated files as:
FILE: path/to/file.tsx
[file content]

NEVER wrap file content in markdown code blocks.
"""


class FrontendAgent(BaseAgent):
    def __init__(self):
        super().__init__("FRONTEND", SYSTEM_PROMPT, tier="code_gen")

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        task_plan = state.get("task_plan", [])
        project_id = state.get("project_id", "unknown")

        # Inter-agent communication: get context from other agents
        backend_files = self.get_files_by_agent(state, "BACKEND")
        database_files = self.get_files_by_agent(state, "DATABASE")

        # Query specific information from backend
        api_routes = self.query_agent(state, "BACKEND", "API routes endpoints")
        data_models = self.query_agent(state, "DATABASE", "database models schema types")

        # Build backend context for frontend integration
        backend_context = self._build_backend_context(backend_files, database_files)

        try:
            await self.log(state, "INFO", "Starting frontend code generation")

            # Call LLM with full context including design requirements
            response = await self.call_llm(
                self._build_prompt(task_plan, backend_context, api_routes, data_models),
                max_tokens=8192
            )

            # Parse generated files
            files = self._parse_files(response)

            # Quality pass: verify no markdown fences
            cleaned_files = {}
            for path, content in files.items():
                cleaned = self._strip_markdown_fences(content)
                cleaned_files[path] = cleaned

            # Write files to state
            await self.write_files_to_state(state, cleaned_files, self.name)

            # Update state
            state.update({
                "frontend_done": True,
                "frontend_output": response,
            })

            await self.log(state, "INFO", f"Frontend code generated ({len(cleaned_files)} files)")

            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "completed",
                "message": f"Frontend code generated ({len(cleaned_files)} files)",
                "projectId": project_id
            })

        except Exception as e:
            state["error"] = str(e)
            await self.log(state, "ERROR", f"Frontend generation failed: {str(e)}")
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "failed",
                "message": f"Frontend failed: {str(e)}",
                "projectId": project_id
            })

        return state

    def _build_backend_context(
        self,
        backend_files: Dict[str, str],
        database_files: Dict[str, str]
    ) -> str:
        """Build context string from backend and database files."""
        context_parts = []

        if backend_files:
            context_parts.append("## Backend Files")
            for path, content in backend_files.items():
                context_parts.append(f"### {path}\n{content}")

        if database_files:
            context_parts.append("## Database Schema")
            for path, content in database_files.items():
                context_parts.append(f"### {path}\n{content}")

        return "\n\n".join(context_parts)

    def _build_prompt(
        self,
        task_plan: list,
        backend_context: str,
        api_routes: str,
        data_models: str,
    ) -> str:
        """Build prompt with all context for frontend generation."""
        return f"""
Generate a beautiful, fully functional frontend application based on the following context.

## CRITICAL: Design Requirements
- The app must look PREMIUM — like a modern SaaS product, not a tutorial example
- Use the Geist font system via `geist/font/sans` in layout.tsx
- Implement dark mode toggle with `next-themes` or conditional classes
- All cards must use: rounded-2xl, border, shadow-sm, hover:shadow-md, transition-all
- All buttons must use: rounded-xl, font-medium, with hover states
- All inputs must use: rounded-xl, focus:ring-2 focus:ring-blue-500/20
- Use Framer Motion for page/list animations where appropriate
- Include a stunning empty state with Lucide icon and helpful message
- Include loading states and error handling UI
- Follow the 8pt spacing grid consistently
- Use the color system: Blue-600 primary, Emerald-500 success, Amber-500 warning, Red-500 danger, Slate for neutrals

## Task Plan
{json.dumps(task_plan, indent=2)}

## Backend Context
{backend_context or "No backend files available"}

## API Routes
{api_routes or "No API routes specified"}

## Data Models
{data_models or "No data models specified"}

## File Structure
Generate these files at minimum:
- app/layout.tsx — with GeistSans font, metadata, suppressHydrationWarning
- app/page.tsx — main page with inline sub-components
- app/globals.css — Tailwind directives + custom keyframes
- store/index.ts — Zustand store with persist middleware
- types/index.ts — all TypeScript interfaces

## Rules
1. NEVER use markdown code fences (\`\`\`tsx) inside file content
2. NEVER use emojis as UI elements — use Lucide icons only
3. ALWAYS make forms functional with proper onSubmit handlers
4. ALWAYS implement CRUD operations in the Zustand store
5. ALWAYS include filtering, sorting, and search functionality
6. ALWAYS show statistics/dashboard cards at the top
7. ALWAYS include a progress indicator (bar or circular)

Create TypeScript/React components that properly integrate with the backend APIs.
Ensure your types match the backend response types exactly.
"""

    def _strip_markdown_fences(self, content: str) -> str:
        """Remove markdown code fences from generated content."""
        lines = content.split('\n')
        cleaned = []
        in_fence = False
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('```'):
                in_fence = not in_fence
                continue
            cleaned.append(line)
        return '\n'.join(cleaned)
