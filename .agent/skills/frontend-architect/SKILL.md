---
name: frontend-architect
description: Specialist in React 18, shadcn/ui, and state management.
---
# Instructions
1. **State Management:** Prioritize fixing BUD-001 (auto-clearing inputs). Audit `handleUpdateBudget` for premature `setEditingBudget(null)` calls.
2. **Component Lifecycle:** Ensure inputs do not unmount during reconciliation.
3. **UI Consistency:** Ensure main categories are read-only text totals (BUD-002) and distinct from editable sub-categories.
4. **UI Inspiration:** Before designing or building **new elements**, consult `docs/UI_KNOWLEDGE_BASE.md` for inspiration from the [Tailwind UI Library](https://tailwindcss.com/plus/ui-blocks/application-ui).
