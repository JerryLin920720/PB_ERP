const puppeteer = require('puppeteer');

const testSheet = async (browser, sheetId, sheetLabel, permKey) => {
  const page = await browser.newPage();
  let errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.toString()));
  
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  
  try {
    await page.waitForSelector('input[type="password"]', { timeout: 2000 });
    // login
    await page.type('input[type="text"], input[placeholder*="User"]', 'admin');
    await page.type('input[type="password"]', 'admin123456');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  } catch(e) {
    // maybe already logged in or auto-login
  }
  
  // open sheet
  await page.evaluate(({sheetId, sheetLabel, permKey}) => {
    window.dispatchEvent(new CustomEvent('mdi-open-sheet', {
      detail: { sheetId, sheetLabel, params: { permissionKey: permKey } }
    }));
  }, {sheetId, sheetLabel, permKey});
  
  await new Promise(r => setTimeout(r, 2000));
  const body = await page.evaluate(() => document.body.innerHTML);
  const isBlank = body.includes('<div id="root"></div>') || !body.includes('win32-desktop');
  
  await page.close();
  return { sheetId, errors, isBlank };
};

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  
  const results = [];
  results.push(await testSheet(browser, 'ba001', 'BA001', 'w_ba001'));
  results.push(await testSheet(browser, 'ba015', 'BA015', 'w_ba015'));
  results.push(await testSheet(browser, 'dp030', 'DP030', 'w_dp030'));
  results.push(await testSheet(browser, 'dp040', 'DP040', 'w_dp040'));
  
  console.log(JSON.stringify(results, null, 2));
  
  await browser.close();
})();
