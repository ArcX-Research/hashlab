import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fixedReport, savedReport } from './fixtures';

const file = (name: string, report: unknown) => ({
  name,
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(report)),
});

test('detects a bug, verifies the correction, and reopens its saved evidence', async ({
  page,
}, info) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:5182/')) external.push(request.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Run 117 tests' }).click();
  await expect(page.getByRole('button', { name: 'Save report' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Selected test' })).toContainText(
    'Mismatch',
  );
  await expect(page.locator('.bit-caption')).toContainText('130');
  const saving = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save report' }).click();
  const download = await saving;
  const path = info.outputPath('fault.json');
  await download.saveAs(path);

  await page.getByRole('button', { name: 'Try the correct version' }).click();
  await expect(page.getByRole('heading', { name: 'Every hash matches' })).toBeVisible();
  await expect(page.locator('.map-legend')).toContainText('117 match');
  await page.getByLabel('Choose Hashprobe reports').setInputFiles(path);
  await expect(page.getByRole('heading', { name: /wrong hashes found/ })).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('compares reports, keeps metadata as text, and rejects a false pass', async ({ page }) => {
  await page.goto('/');
  const before = savedReport();
  const after = fixedReport();
  await page
    .getByLabel('Choose Hashprobe reports')
    .setInputFiles([file('one.json', before), file('two.json', before), file('three.json', after)]);
  await expect(page.getByRole('alert')).toContainText(
    'Choose one report, or two reports to compare.',
  );
  await expect(page.getByRole('heading', { name: 'Open a Hashprobe report' })).toBeVisible();
  after.target.command = ['<img src=x onerror=alert(1)>'];
  await page
    .getByLabel('Choose Hashprobe reports')
    .setInputFiles([file('before.json', before), file('after.json', after)]);
  await expect(page.locator('.comparison-counts')).toContainText('1 now pass');
  await expect(page.locator('.report-detail > code')).toHaveText(after.target.command[0]);
  await expect(page.locator('.report-detail img')).toHaveCount(0);
  before.results[1].status = 'pass';
  await page.getByLabel('Choose Hashprobe reports').setInputFiles(file('invalid.json', before));
  await expect(page.getByRole('alert')).toContainText('hashes differ');
  await expect(page.locator('.report-heading')).toContainText('after.json');
});

test('recovers from an empty seed and preserves the chosen theme', async ({ page }) => {
  await page.goto('/');
  const theme = page.getByRole('switch', { name: 'Dark mode' });
  await expect(theme).toBeChecked();
  await page.getByRole('textbox', { name: 'Random seed' }).fill('');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run 117 tests' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Random seed' }).fill('4294967295');
  await expect(page.getByRole('button', { name: 'Run 117 tests' })).toBeEnabled();
  await theme.click();
  await page.reload();
  await expect(theme).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('has accessible results in both themes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Run 117 tests' }).click();
  await expect(page.getByRole('button', { name: 'Save report' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('switch', { name: 'Dark mode' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
