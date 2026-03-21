import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'docs', 'PRD', 'UI_Specification', 'screenshots');

test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
});

test('Capture comprehensive screenshots of all UI states', async ({ page }) => {
    // Standard desktop viewport + Large Viewport
    test.setTimeout(180000); // 3 minutes for exhaustive sweeping
    await page.setViewportSize({ width: 1440, height: 900 });
    
    let ssCount = 1;
    const snap = async (name: string) => {
        const prefix = ssCount.toString().padStart(2, '0');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${prefix}_${name}.png`), fullPage: true });
        ssCount++;
    };

    // 1. Initial Login State
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await snap('Login_Default');

    // 2. Local Demo Login
    await page.getByRole('button', { name: 'Bypass to Local Demo Account' }).click();
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await snap('Login_Filled');
    await page.press('input[type="password"]', 'Enter');
    
    await page.locator('text="Overview"').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(3000); 

    // --- DASHBOARD ---
    await snap('Dashboard_MainFlow');
    
    // Check Special Accounts
    const specialTab = page.locator('button[role="tab"], a').filter({ hasText: 'Special Accounts' });
    if (await specialTab.isVisible()) {
        await specialTab.click();
        await page.waitForTimeout(1000);
        await snap('Dashboard_SpecialAccounts');
    }

    // --- TRANSACTIONS ---
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await snap('Transactions_Table_Default');

    // Validation Mode
    const validationBtn = page.locator('button', { hasText: 'Validation Mode' });
    if (await validationBtn.isVisible()) {
        await validationBtn.click();
        await page.waitForTimeout(1000);
        await snap('Transactions_ValidationMode');
        await validationBtn.click(); // toggle off
        await page.waitForTimeout(500);
    }

    // Date Range Picker (Custom)
    const dateBtn = page.locator('button', { hasText: 'This Month' }).first();
    if (await dateBtn.isVisible()) {
        await dateBtn.click();
        await page.waitForTimeout(500);
        const customTab = page.locator('button', { hasText: 'Custom' });
        if (await customTab.isVisible()) {
            await customTab.click();
            await page.waitForTimeout(500);
            await snap('Transactions_DateRange_CustomPicker');
            await page.keyboard.press('Escape');
        } else {
            await page.keyboard.press('Escape');
        }
    }

    // Add Transaction Drawer
    const addTxBtn = page.locator('button', { hasText: 'Add Transaction' }).first();
    if (await addTxBtn.isVisible()) {
        await addTxBtn.click();
        await page.waitForTimeout(1000);
        await snap('Transactions_AddDrawer');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
    }

    // Edit Transaction Drawer (click first row)
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForTimeout(1000);
        await snap('Transactions_EditDrawer');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
    }

    // Export Modal
    const exportBtn = page.locator('button', { hasText: 'Export' });
    if (await exportBtn.isVisible()) {
        await exportBtn.click();
        await page.waitForTimeout(1000);
        await snap('Transactions_ExportModal');
        await page.keyboard.press('Escape');
    }

    // --- FULL BUDGET ---
    await page.goto('/budget');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await snap('Budget_Matrix_Default');

    // Expand a category (e.g., Food or Housing)
    const expandBtn = page.locator('button').filter({ hasText: /Food|Housing/i }).first();
    if (await expandBtn.isVisible()) {
        await expandBtn.click();
        await page.waitForTimeout(1000);
        await snap('Budget_Matrix_Expanded_Category');
        
        // Attempt to click a cell to show edit state
        const editableCell = page.locator('td').filter({ hasText: /^\$[\d,]+$/ }).first();
        if (await editableCell.isVisible()) {
            await editableCell.click();
            await page.waitForTimeout(500);
            await snap('Budget_Matrix_Cell_Edit');
            await page.keyboard.press('Escape');
        }
    }

    // --- PROJECTIONS ---
    await page.goto('/projection'); 
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await snap('Projections_1_Year_Baseline'); // 1 Year Default

    // 3 Year
    const yr3Btn = page.locator('button', { hasText: '3 Year' });
    if (await yr3Btn.isVisible()) {
        await yr3Btn.click();
        await page.waitForTimeout(2000);
        await snap('Projections_3_Year_Baseline');
    }

    // 5 Year
    const yr5Btn = page.locator('button', { hasText: '5 Year' });
    if (await yr5Btn.isVisible()) {
        await yr5Btn.click();
        await page.waitForTimeout(2000);
        await snap('Projections_5_Year_Baseline');
    }
    
    // Switch to Scenario
    const scenarioTab = page.locator('button', { hasText: 'Buy New Car' });
    if (await scenarioTab.isVisible()) {
        await scenarioTab.click();
        await page.waitForTimeout(2000);
        await snap('Projections_Scenario_View');
    }

    // --- SETTINGS ---
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await snap('Settings_Profile');
    
    const prefTab = page.locator('button, a').filter({ hasText: 'Preferences' }).first();
    if (await prefTab.isVisible()) {
        await prefTab.click();
        await page.waitForTimeout(1000);
        await snap('Settings_Preferences');
    }

    const rulesTab = page.locator('button, a').filter({ hasText: /Rules/i }).first();
    if (await rulesTab.isVisible()) {
        await rulesTab.click();
        await page.waitForTimeout(1000);
        await snap('Settings_RulesEngine');
        
        // Open 'Configure Rule Engine' dialog
        const configureBtn = page.locator('button', { hasText: 'Configure Rule Engine' }).first();
        if (await configureBtn.isVisible()) {
            await configureBtn.click();
            await page.waitForTimeout(1000);
            await snap('Settings_RulesEngine_Modal');
            await page.keyboard.press('Escape');
        }
    }
});
