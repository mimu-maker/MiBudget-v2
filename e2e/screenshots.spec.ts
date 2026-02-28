import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'docs', 'PRD', 'Artefacts', 'screenshots');

test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
});

test('Capture screenshots of main views', async ({ page }) => {
    // Standard desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_Dashboard.png'), fullPage: true });

    // 2. Transactions
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_Transactions.png'), fullPage: true });

    // 3. Budget
    await page.goto('/budget');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_Budget.png'), fullPage: true });

    // 4. Projections
    await page.goto('/projections');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_Projections.png'), fullPage: true });

    // 5. Settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_Settings.png'), fullPage: true });
});
