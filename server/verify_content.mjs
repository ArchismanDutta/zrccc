import { chromium } from 'playwright';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMTdlYThmNTdlNGMxNGVhZWJhMzMwYiIsInJvbGUiOiJzdXBlcl9hZG1pbiIsInJvbGVMZXZlbCI6MTAsImlhdCI6MTc4MDM5ODI0OSwiZXhwIjoxNzgwNDEyNjQ5fQ.WGFtuEIIuzowagaP3xcdu4FRp36J1yqJQCVyKPfhJHU';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173');
await page.evaluate(t => localStorage.setItem('zrc_token', t), TOKEN);
await page.goto('http://localhost:5173/content');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);

const body = await page.textContent('body');
console.log('Calendar header:', body.includes('Content Calendar') ? 'PASS' : 'FAIL');

const events = await page.locator('button.w-full.flex.items-center').all();
console.log('Clickable events found:', events.length);

if (events.length > 0) {
  await events[0].click();
  await page.waitForTimeout(600);
  const modal = await page.textContent('body');
  console.log('Edit modal opens:', modal.includes('Save Changes') ? 'PASS' : 'FAIL');
  console.log('Caption field:', modal.includes('Caption') ? 'PASS' : 'FAIL');
  console.log('Status dropdown:', modal.includes('Status') ? 'PASS' : 'FAIL');
  console.log('Scheduled Date:', modal.includes('Scheduled Date') ? 'PASS' : 'FAIL');
  await page.screenshot({ path: '/tmp/content_edit_modal.png' });
  await page.keyboard.press('Escape');
}

await page.screenshot({ path: '/tmp/content_calendar.png' });
await browser.close();
console.log('Done');
