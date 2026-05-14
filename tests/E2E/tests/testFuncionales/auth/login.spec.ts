import { test } from '@playwright/test';
import { testEnvironment, requireCredentials } from '../../../lib/testEnvironment';
import { LoginView } from '../../../views/loginView';

test.describe('Authentication', () => {
  test.beforeEach(() => {
    requireCredentials();
  });

  test('logs in with valid credentials', async ({ page }) => {
    const loginView = new LoginView(page);

    await loginView.goToLogin(testEnvironment.baseUrl);
    await loginView.expectLoginPage();
    await loginView.login(testEnvironment.userEmail, testEnvironment.userPassword);
    await loginView.expectAuthenticated();
  });
});
