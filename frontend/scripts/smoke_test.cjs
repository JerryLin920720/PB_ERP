const puppeteer = require('puppeteer');

const TARGET_URL = 'http://localhost:5174';

const BLOCKING_ERROR_PATTERNS = [
  'ReferenceError',
  'TypeError',
  'Cannot read properties of undefined',
  'Cannot access',
  'before initialization',
  'import',
  'export',
  'Maximum update depth exceeded'
];

const testTarget = async (browser, target) => {
  const page = await browser.newPage();
  let blockingErrors = [];
  let warnings = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      const isBlocking = BLOCKING_ERROR_PATTERNS.some(p => text.includes(p));
      if (isBlocking) {
        blockingErrors.push(text);
      } else {
        warnings.push(text);
      }
    } else if (msg.type() === 'warning') {
      warnings.push(text);
    }
  });

  page.on('pageerror', err => {
    const text = err.toString();
    const isBlocking = BLOCKING_ERROR_PATTERNS.some(p => text.includes(p));
    if (isBlocking) {
      blockingErrors.push(text);
    } else {
      warnings.push(text);
    }
  });

  await page.goto(TARGET_URL, { waitUntil: 'networkidle0' });

  // Attempt login if not already logged in
  try {
    await page.waitForSelector('input[type="password"]', { timeout: 2000 });
    await page.type('input[type="text"], input[placeholder*="User"]', 'admin');
    await page.type('input[type="password"]', 'admin123456');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  } catch(e) {
    // Already logged in or login form not found
  }

  // If testing a specific sheet, open it
  if (target.sheetId) {
    await page.evaluate(({sheetId, sheetLabel, permKey}) => {
      window.dispatchEvent(new CustomEvent('mdi-open-sheet', {
        detail: { sheetId, sheetLabel, params: { permissionKey: permKey } }
      }));
    }, {
      sheetId: target.sheetId,
      sheetLabel: target.label,
      permKey: target.permKey
    });
    
    // Give it some time to render
    await new Promise(r => setTimeout(r, 2000));
  } else {
    // Testing MDI Shell / Home
    await new Promise(r => setTimeout(r, 2000));
  }

  // Check for blank screen (no active viewports or fatal unmounts root children)
  const body = await page.evaluate(() => document.body.innerHTML);
  
  let isBlank = false;
  if (target.sheetId) {
    // If it's a sheet, there should be either a dw-container or an erp-workbench
    isBlank = body.includes('<div id="root"></div>') || (!body.includes('win32-desktop') && !body.includes('mdi-'));
  } else {
    // If it's shell, just check it has win32-desktop or sidebar
    isBlank = !body.includes('win32-desktop') && !body.includes('sidebar');
  }

  await page.close();

  return {
    target: target.label,
    isBlank,
    blockingErrors,
    warnings: warnings.slice(0, 5) // limit output
  };
};

(async () => {
  console.log('🚀 Starting Frontend Smoke Test Guard...');
  const browser = await puppeteer.launch({ headless: "new" });

  const targets = [
    { label: 'MDI Shell (Home)', sheetId: null },
    { label: 'BA001 (Pattern A)', sheetId: 'ba001', permKey: 'w_ba001' },
    { label: 'BA015 (Pattern A)', sheetId: 'ba015', permKey: 'w_ba015' },
    { label: 'DP025 (Pattern B)', sheetId: 'dp025', permKey: 'w_dp025' },
    { label: 'DP030 (Pattern B)', sheetId: 'dp030', permKey: 'w_dp030' },
    { label: 'DP040 (Pattern B)', sheetId: 'dp040', permKey: 'w_dp040' }
  ];

  let hasFatal = false;
  const results = [];

  for (const target of targets) {
    console.log(`\n⏳ Testing ${target.label}...`);
    const res = await testTarget(browser, target);
    results.push(res);
    
    if (res.isBlank) {
      console.error(`❌ [FAILED] ${target.label} resulted in a Blank Screen.`);
      hasFatal = true;
    } else if (res.blockingErrors.length > 0) {
      console.error(`❌ [FAILED] ${target.label} encountered Blocking Errors:`);
      res.blockingErrors.forEach(err => console.error(`   - ${err}`));
      hasFatal = true;
    } else {
      console.log(`✅ [OK] ${target.label} passed.`);
    }
  }

  await browser.close();

  if (hasFatal) {
    console.error('\n🚨 Smoke Test Guard FAILED! Do not proceed with deployment or Phase sealing until issues are resolved.');
    process.exit(1);
  } else {
    console.log('\n🎉 All targets passed the Smoke Test Guard successfully.');
    process.exit(0);
  }
})();
