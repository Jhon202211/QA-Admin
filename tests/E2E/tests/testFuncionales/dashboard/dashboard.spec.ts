import { test } from '@playwright/test';
import { testEnvironment, requireCredentials } from '../../../lib/testEnvironment';
import { DashboardView } from '../../../views/dashboardView';
import { LoginView } from '../../../views/loginView';

test.describe('Dashboard', () => {
  test.beforeEach(() => {
    requireCredentials();
  });

  test('shows manual and automated metrics sections', async ({ page }) => {
    const loginView = new LoginView(page);
    const dashboardView = new DashboardView(page);

    await loginView.goToLogin(testEnvironment.baseUrl);
    await loginView.login(testEnvironment.userEmail, testEnvironment.userPassword);
    await dashboardView.goToDashboard(testEnvironment.baseUrl);
    await dashboardView.expectLoaded();
    await dashboardView.openAutomatedMetrics();
  });
});
