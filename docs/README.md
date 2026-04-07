# MiBudget Docs

## Product

- [Product Requirements](PRD/product-requirements.md) — what the app is, who uses it, feature list, epic status
- [Epics](PRD/epics/) — detailed feature specs (some aspirational)
- [Screenshots](PRD/Artefacts/screenshots/) — reference UI screenshots

## Technical Specs

- [Architecture](TechSpec/architecture.md) — stack, provider hierarchy, key patterns
- [Auth Model](TechSpec/auth-model.md) — shared-account design, RLS, demo user, session security
- [Database Schema](TechSpec/database-schema.md) — all tables, columns, RLS summary, key functions

## Security

- [Device Trust Policy](security/DEVICE_TRUST_POLICY.md) — trusted device flow

## Plan (Work for Gemini / upcoming phases)

- [Phase 3: Classification Rules](Plan/phase3-classification-rules.md) — merge merchant_rules + source_rules → classification_rules
- [Demo Lifecycle](Plan/demo-lifecycle.md) — inactivity timer + reset-on-signout
- [Migration File Sync](Plan/migration-file-sync.md) — fix outdated bootstrap migration file
