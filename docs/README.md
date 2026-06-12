# MiBudget Docs

## Product

- [Product Vision](PRD/product-vision.md) — problem statement, why this exists, success criteria, phase scope
- [Product Requirements](PRD/product-requirements.md) — user stories, requirements, acceptance criteria, phase 1 backlog
- [Epics](PRD/epics/) — detailed feature specs per epic
- [UI Specification](PRD/UI_Specification/) — sample data, screenshots, flow references

## Technical Specs

- [Architecture](TechSpec/architecture.md) — stack, provider hierarchy, key patterns, routes
- [Auth Model](TechSpec/auth-model.md) — shared-account design, RLS, demo user, session security
- [Database Schema](TechSpec/database-schema.md) — all tables, columns, RLS summary, key functions

## Security

- [Device Trust Policy](security/DEVICE_TRUST_POLICY.md) — trusted device flow, inactivity timeout

## Plan (Active work)

- [Phase 3: Classification Rules](Plan/phase3-classification-rules.md) — merge merchant_rules + source_rules → classification_rules
- [Demo Lifecycle](Plan/demo-lifecycle.md) — inactivity timer + reset-on-signout
- [Schema Issues](Plan/schema-issues.md) — types.ts regeneration, scenarios RLS, duplicate budget records
- [Currency at Account Level](Plan/currency-account-level.md) — move currency from user_profiles → accounts

> Completed or superseded task specs are in [Plan/archive/](Plan/archive/).

## AI Agent Primer

- [GEMINI_PRIMER.md](GEMINI_PRIMER.md) — critical rules for AI agents working in this codebase
