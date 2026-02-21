---
description: The default process for all functional changes, ensuring architectural integrity, PRD compliance, and persistent local logging.
---

# 🚀 Standard Implementation Flow

This workflow is used when a task requires coordination across database schema, frontend architecture, and product requirements. It leverages a "Scribe" mechanism to maintain context without excessive Git traffic.

### **Phase 1: Inception & Strategy (Read-Only)**
1. **Invoke Core Skills**: `@[.agent/skills/architect]` and `@[.agent/skills/product-owner]`.
2. **Decomposition**: 
   - `Product Owner`: Decompose the request into clear Acceptance Criteria (AC) and map them to `Mibudget_PRD.md`.
   - `Architect`: Perform code analysis, define the technical strategy, and identify required specialty skills (e.g., Supabase, Frontend, Locale).
3. **Log Initialization**: The Architect ensures `.agent/IMPLEMENTATION_LOG.md` is initialized/cleared for the new task.
4. **USER CHECKPOINT**: Present the Requirements + Strategy. **Do not proceed** until the user gives explicit approval (e.g., "Implementation Approved" or "Go ahead").

### **Phase 2: Specialty Refinement**
1. **Invoke Specialists**: Call the skills identified in Phase 1 (e.g., `@[.agent/skills/supabase-architect]`).
2. **Detailed Design**: Specialists provide specific implementation details (e.g., exact SQL schema, component signatures, or hook logic).

### **Phase 3: Implementation & Local Scribing**
1. **Direct Build**: Perform code changes on the active branch.
2. **The Scribe**: After every significant logic or UI change, invoke `@[.agent/skills/git-scribe]` to add a descriptive note to `.agent/IMPLEMENTATION_LOG.md`. 
3. **Verification**: Verify the build and tests as changes are made.

### **Phase 4: Validation & PRD Mapping**
1. **Compliance**: `@[.agent/skills/prd-compliance]` validates the implementation against the Phase 1 AC and `Mibudget_PRD.md`.
2. **Technical Audit**: `@[.agent/skills/branch-auditor]` performs a final technical sanity check.

### **Phase 5: Closure & Final Commit**
1. **Synthesize**: When the user is ready to commit, invoke `@[.agent/skills/git-scribe]`. 
2. **Quality Message**: The Scribe will read `.agent/IMPLEMENTATION_LOG.md` plus `git diff` to generate a high-quality Conventional Commit.
3. **Cleanup**: Clear the local log file after a successful commit.
4. **Pre-Review**: Invoke `/pre-review` to confirm technical and strategic alignment.
