# UI Design Knowledge Base

## Key Resources & Inspiration

### **Primary UI Inspiration Library**
- **Library**: [Tailwind UI Plus Application UI](https://tailwindcss.com/plus/ui-blocks/application-ui)
- **Use Case**: Reference this library whenever creating **new UI elements**, components, or layout structures.
- **Why**: Preferred aesthetic for MiBudget. Focus on "Application UI" patterns (dashboards, tables, forms, overlays).

## Design Principles

1. **New Elements Only**: Use inspiration from the primary library when building *new* features. Avoid forced retrofitting of stable existing UI unless explicitly requested.
2. **Standardization**: Align new components with the "Application UI" blocks to ensure a premium, unified feel across MiBudget.
3. **Fidelity**: Aim for production-grade finishes (shadows, transitions, spacing) consistent with the inspiration library.

## Integration Patterns

- **shadcn/ui**: Map Tailwind UI blocks to local shadcn components (`/src/components/ui`).
- **Icons**: Use **Lucide** icons for compatibility with the existing design system.
- **Colors**: Use the MiBudget theme variables defined in `src/index.css`.
