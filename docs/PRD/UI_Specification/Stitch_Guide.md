# Google Stitch Usage Guide (MiBudget UI Refinement)

Google Stitch (https://stitch.withgoogle.com/) thrives on extreme context. By providing it the generated screenshots alongside our hyper-granular `.md` matrices, you will effectively instruct Stitch how to perfectly refine the complex `MiBudget` application UI without hallucinating generic designs.

## Prerequisites
Before engaging with Stitch, you must generate the absolute latest state of the application. 
Because node modules and sandboxing can be restrictive in IDEs, execute this manually in your local terminal:

```bash
# 1. Ensure you are in the application root
cd /Users/mimu/MiMU.dev/MiBudget

# 2. Start the local dev server in one terminal
npm run border (or npm run dev)

# 3. In a SECOND terminal, run the exhaustive Playwright UI Spec capture we just wrote:
npx playwright test e2e/screenshots.spec.ts
```
*This script will bypass standard Google Auth by clicking your **"Bypass to Local Demo Account"** button and logging in as the calibrated `demo@example.com` (`demo123`) user.* It will automatically capture a massive, sequenced **30+ high-fidelity screenshot suite** (covering every drawer, modal, and state) to the `/docs/PRD/UI_Specification/screenshots` directory.

## Feeding Stitch

1. **Upload Assets**:
   Zip the entire `/docs/PRD/UI_Specification` folder containing:
   - All the 30+ exported PNG screenshots.
   - The heavily expanded `UI_UX_Specification.md` document.
   Upload this zip directly to the Stitch prompt window.

2. **The Golden Prompt**:
   Copy and paste the exact prompt below into Google Stitch to trigger its refinement engine:

> "I have uploaded the definitive UI/UX Architectural Matrix and 30+ comprehensive state screenshots for the MiBudget application. Our goal is to unify the UI components utilizing React 18, Tailwind CSS, and Shadcn UI. 
> 
> BEFORE WRITING ANY CODE, you must aggressively analyze the `UI_UX_Specification.md` document, paying absolute strict attention to 'Section 0: Strategic UX Philosophy' (we are building a premium, dense, forward-looking financial forecasting engine for professionals—not a basic expense tracker). 
> 
> Your directive is to audit the provided screenshots against the hyper-granular visual matrix and correct all inconsistencies in my components. Specifically:
> 1. Identify any disparities in padding, font tabular lining, and corner rounding between the 'Overview Metric Cards', the default inputs, and the legacy 'LocalLogin' vs 'SignInScreen'.
> 2. Ensure all Z-Index, spacing tokens, and color semantics explicitly obey the exact Tailwind classes defined in the Matrix. 
> 3. Refactor the code for the 'Export' modal and 'Add Transaction' Action Bar buttons so their height, shadow elevations, and icon geometry align perfectly to the spec.
> 
> Output the specific refactored `.tsx` code blocks so I can implement them directly into my source-code."

3. **Bringing Changes Back**:
   Once Stitch gives you the refactored `.tsx` components (like updated Shadcn overrides or direct layout components like `SignInScreen.tsx`), simply bring the URL or the completed code snippets back to our IDE chat! Instruct me to: *"Assimilate the Stitch output for the Action Bar buttons..."* and I will apply them safely across the codebase.
