---
name: branch-auditor
description: Audits massive code changes from Windsurf and manages branch transitions.
---

# Branch Audit Protocol
1. **Analyze Delta:** Run `git diff main` to identify logic changes.
2. **Account Check:** Verify that `mimu@mimu.dev` is the committer. Flag any hardcoded secrets.
3. **Debt Tracking:** Identify files >300 lines or complex blocks missing types.
4. **Handoff:** Generate a `DEBT.md` summarizing what needs refactoring in the new branch.