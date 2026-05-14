import { test } from '@playwright/test';
import { testEnvironment, requireCredentials } from '../../lib/testEnvironment';
import { DashboardView } from '../../views/dashboardView';
import { LoginView } from '../../views/loginView';
import { TestCasesView } from '../../views/testCasesView';

test.describe('E2E flow: manual testing workspace', () => {
  test.beforeEach(() => {
    requireCredentials();
  });

  test('logs in, validates the dashboard, and opens manual test cases', async ({ page }) => {
    const loginView = new LoginView(page);
    const dashboardView = new DashboardView(page);
    const testCasesView = new TestCasesView(page);

    await loginView.goToLogin(testEnvironment.baseUrl);
    await loginView.login(testEnvironment.userEmail, testEnvironment.userPassword);

    await dashboardView.goToDashboard(testEnvironment.baseUrl);
    await dashboardView.expectLoaded();

    await testCasesView.goToManualTests(testEnvironment.baseUrl);
    await testCasesView.expectLoaded();
    await testCasesView.openListView();
  });
});
