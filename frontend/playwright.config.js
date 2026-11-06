import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    outputDir: './e2e-results/articfacts',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    forbidOnly: Boolean(process.env.CI),
    reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }], 
    ['list'], 
    ['junit', { outputFile: './e2e-results/junit.xml' }],
],

use: {
    baseURL: 'http://localhost:5173',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
},

projects: [
    {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
    }
],
})