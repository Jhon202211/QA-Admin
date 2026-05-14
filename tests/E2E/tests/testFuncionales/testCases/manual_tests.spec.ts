import { test } from '@playwright/test';
import { testEnvironment, requireCredentials } from '../../../lib/testEnvironment';
import { LoginView } from '../../../views/loginView';
import { TestCasesView } from '../../../views/testCasesView';

test.describe('Manual test cases', () => {
  test.beforeEach(() => {
    requireCredentials();
  });

  test('opens manual test case views', async ({ page }) => {
    const loginView = new LoginView(page);
    const testCasesView = new TestCasesView(page);

    await loginView.goToLogin(testEnvironment.baseUrl);
    await loginView.login(testEnvironment.userEmail, testEnvironment.userPassword);
    await testCasesView.goToManualTests(testEnvironment.baseUrl);
    await testCasesView.expectLoaded();
    await testCasesView.openListView();
  });
});
