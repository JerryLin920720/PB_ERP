const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  try {
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Fill login
    await page.type('input[placeholder*="Username"], input[type="text"]', 'admin');
    await page.type('input[type="password"]', 'admin123456');
    await page.click('button[type="submit"]');
    
    // Wait for network
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});
    
    // Click on DP030 in the sidebar
    // We can evaluate JS to simulate opening DP030 via the global event listener `mdi-open-sheet`
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mdi-open-sheet', {
        detail: {
          sheetId: 'dp030',
          sheetLabel: '樣品單資料管理',
          params: { permissionKey: 'w_dp030' }
        }
      }));
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const body = await page.evaluate(() => document.body.innerHTML);
    console.log('BODY after opening dp030:', body.substring(0, 500));
  } catch (e) {
    console.log('SCRIPT ERR:', e.message);
  }
  await browser.close();
})();
