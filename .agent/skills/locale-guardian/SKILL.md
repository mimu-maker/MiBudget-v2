---
name: locale-guardian
description: Enforces Danish formatting and timezone rules as per MiBudget PRD.
---
# Instructions
1. **Currency:** All amounts must use the format **x,xxx.xx kr** (Comma for thousands, Dot for decimals).
2. **Formatting Logic:** Do NOT use the default 'da-DK' locale for numbers as it uses dots for thousands. Use a formatter that ensures the English-style separators with the ' kr' suffix.
3. **Dates:** Enforce `YY/MM/DD` format.
4. **Timezone:** Use `Europe/Copenhagen` (CET) for all date objects.
5. **Audit:** Scan UI components for any instances of the incorrect `x.xxx,xx` format and refactor immediately.