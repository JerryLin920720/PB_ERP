# Debug Note: DP020 Save Network Error Investigation

## 1. Request Details
*   **Request URL:** `http://localhost:8001/api/dp020/deep_save/` (or `http://localhost:8001/api/dp020/` if fallback is used)
*   **HTTP Method:** `POST`
*   **Request Payload:**
    ```json
    {
      "master": {
        "gkey": "temp_xxx",
        "heelno": "HEEL-001",
        "year": "2026",
        "issuedate": "2026-05-28",
        "adopted": "N",
        "ba055gkey": "season_gkey",
        "unit": "CM",
        "heelheight": 5.5,
        "material": "Rubber",
        "ba015gkey": "supplier_gkey",
        "dp010gkey": "last_gkey",
        "dp015gkey": "bottom_gkey",
        "description": "Black rubber heel",
        "remark": "",
        "photopath": ""
      }
    }
    ```
*   **Status Code:** None (`ERR_CONNECTION_REFUSED` / Network Error)

## 2. Root Cause Analysis
*   **Backend Server Port:** The backend Django server is currently running on `http://127.0.0.1:8000/` (default port `8000`).
*   **Frontend Hardcoded Port:** The frontend application (via `getFullUrl` in `useRecordWorkbenchCrud.js` and other configuration files) is hardcoded to call port `8001` (`http://localhost:8001/api/...`).
*   **Result:** The browser failed to establish a TCP connection to port `8001`, resulting in the `Network Error` connection refusal. No request logs appeared in the Django `runserver` terminal because the request never reached it.

## 3. How to Resolve
Please restart the Django backend on port `8001` by running:
```bash
python manage.py runserver 8001
```
This aligns the backend with the frontend's hardcoded port configurations and will restore API connectivity.

## 4. Verification Check
Running the backend on `8001` ensures:
1. Front-end requests are successfully received by the Django backend.
2. Saving/loading records works as expected.
3. Lookup popups function normally.
