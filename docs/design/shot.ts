import { chromium } from 'playwright-core';
const b = await chromium.connectOverCDP('ws://127.0.0.1:9222');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
for (const f of ['Main', 'Home', 'Timer', 'WorkoutLight', 'HomeLight', 'TimerLight', 'Welcome', 'WelcomeLight', 'Session', 'SessionLight']) {
  const p = await ctx.newPage();
  await p.goto(`file://${process.cwd()}/${f}.dc.html`);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${f}.png` });
  await p.close();
}
await b.close();
console.log('done');
