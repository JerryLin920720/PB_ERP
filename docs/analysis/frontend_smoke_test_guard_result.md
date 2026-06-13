# Phase 7D-6A: Frontend Smoke Test Guard Result

## 1. 任務目標 (Objective)
建立並自動化執行前端「冒煙測試 (Smoke Test)」，以防範未來在修改底層框架 (包含 `hooks`, `factory`, `lookup`, `Win32DataWindow`, `programRegistry`) 後，不慎引發如全域 `ReferenceError` 或白畫面 (Blank Screen) 的嚴重中斷錯誤。

## 2. 實作細節 (Implementation)
- **測試腳本建立**：已建立 `frontend/scripts/smoke_test.cjs`。
- **自動化測試工具**：利用 `puppeteer` 以 Headless 模式模擬真實用戶登入並點開各項關鍵作業。
- **錯誤偵測與攔截**：
  - 腳本將監聽 `console.error` 與 `pageerror` 事件。
  - 當捕獲到以下關鍵字，即視為 **Blocking Error (阻斷性錯誤)**，測試將以退出碼 `1` 失敗：
    - `ReferenceError`
    - `TypeError`
    - `Cannot read properties of undefined`
    - `Cannot access` (如 `Cannot access before initialization` / TDZ Error)
    - `import` / `export` 模組錯誤
    - `Maximum update depth exceeded`
  - 另外會從頁面 DOM 檢查是否只剩下 `<div id="root"></div>` 或未載入 `win32-desktop`，藉此判斷是否發生 **白畫面 (Blank Screen)**。
- **NPM Script**：在 `frontend/package.json` 中加入了 `"smoke:frontend": "node scripts/smoke_test.cjs"`。

## 3. 測試範圍 (Test Coverage)
本次測試對象涵蓋了 MDI Shell 及兩大核心開發模式的作業樣本：
1. **MDI Shell (Home)** - 基本全域 Router 與 Context 狀態驗證。
2. **BA001 (Pattern A)** - 靜態資料表單 (使用 `Win32DataWindow` 與 `searchForm`)。
3. **BA015 (Pattern A)** - 靜態資料表單驗證。
4. **DP030 (Pattern B)** - 複雜主從表單 (使用 `useRecordWorkbenchCrud`, `createRecordWorkbenchSheet`)。
5. **DP040 (Pattern B)** - 第二支 Pattern B 主從表單，用以交叉驗證。

## 4. 驗證結果 (Execution Results)
執行 `npm run smoke:frontend` 測試結果如下：

```text
🚀 Starting Frontend Smoke Test Guard...

⏳ Testing MDI Shell (Home)...
✅ [OK] MDI Shell (Home) passed.

⏳ Testing BA001 (Pattern A)...
✅ [OK] BA001 (Pattern A) passed.

⏳ Testing BA015 (Pattern A)...
✅ [OK] BA015 (Pattern A) passed.

⏳ Testing DP030 (Pattern B)...
✅ [OK] DP030 (Pattern B) passed.

⏳ Testing DP040 (Pattern B)...
✅ [OK] DP040 (Pattern B) passed.

🎉 All targets passed the Smoke Test Guard successfully.
```

- **是否發現 Blocking Error？** 否，全部安全通過。
- **是否出現白畫面？** 否，DOM 皆正確載入。
- **編譯測試**：執行 `npm run build` 通過，無語法阻斷問題。

## 5. 未來規範 (Future Policy)
此 Smoke Test Guard 將成為未來底層架構改動的「防波堤」。
**在任何 Phase 的 PR 合併或封版交付前，都必須先在 `frontend` 執行 `npm run smoke:frontend` 並確保全部通過。**
