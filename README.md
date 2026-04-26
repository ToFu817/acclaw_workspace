# 🧾 稅務小豆腐案件管理系統 (AccLaw Case Management System)

這是一個專為會計師事務所設計的現代化案件管理系統，採用 **React + Google Apps Script (GAS) + Google Sheets** 架構。本系統將 Google Sheets 當作資料庫，具備零成本、高度安全且資料完全私有的優點。

---

## 🚀 從零開始：系統建置全攻略

本指南將引導您從頭開始建立屬於自己的案件管理系統。

### 第一階段：準備資料庫 (Google Sheets)

1.  **建立雲端表格**：
    *   登入您的 Google 帳號，前往 [Google Sheets](https://sheets.google.com/)。
    *   點擊「+」建立一張空白試算表，命名為「稅務小豆腐案件管理系統」。
2.  **開啟腳本編輯器**：
    *   在試算表中，點擊上方選單的 **「擴充功能」 > 「Apps Script」**。
3.  **貼上後端程式碼**：
    *   將本專案中 `google-apps-script/Code.gs` 檔案的內容全部複製。
    *   回到 Apps Script 編輯器，刪除原有的 `myFunction`，將內容貼上。
    *   按 **Ctrl + S** 儲存。
4.  **初始化工作表**：
    *   在編輯器上方的工具列，選擇函式 **`initializeSheets`**。
    *   點擊 **「▶️ 執行」**。
    *   *注意：首次執行會要求授權，請點選「查看權限」> 選擇帳號 >「進階」>「前往稅務小豆腐案件管理系統(不安全)」>「允許」。*
    *   執行完成後，回到 Google Sheets，您會發現系統已自動建立了所有必要的分頁（如：工作任務、客戶資料等）。

---

### 第二階段：部署後端 API (GAS Web App)

1.  **新增部署作業**：
    *   在 Apps Script 編輯器右上角，點擊 **「部署」 > 「新增部署作業」**。
    *   點擊齒輪圖示，選擇 **「網頁應用程式」**。
2.  **設定權限**（這一步非常重要）：
    *   **說明**：輸入「v1 正式版」。
    *   **執行身分**：選擇 **「我」**。
    *   **誰可以存取**：選擇 **「所有人」** (Anyone)。
3.  **取得 Web App URL**：
    *   點擊部署後，系統會給你一串網址（結尾是 `/exec`）。
    *   **請複製這串網址**，這就是我們前端要串接的 API 位址。

---

### 第三階段：建置前端開發環境 (本機端)

1.  **安裝 Node.js**：
    *   請先確認電腦已安裝 [Node.js](https://nodejs.org/) (建議使用 v18 以上版本)。
2.  **下載專案原始碼**：
    *   將此專案下載（或從 GitHub Clone）到您的電腦資料夾。
3.  **安裝依賴套件**：
    *   在專案資料夾打開終端機 (PowerShell 或 CMD)，執行：
        ```bash
        npm install
        ```
4.  **設定環境變數**：
    *   在專案根目錄找到 `.env` 檔案（如果沒有請手動建立）。
    *   填入剛才複製的 GAS 網址：
        ```env
        VITE_GAS_URL=你的GAS部署網址
        ```
5.  **啟動系統**：
    *   執行指令啟動開發伺服器：
        ```bash
        npm run dev
        ```
    *   現在你可以透過 `http://localhost:5173` 看到系統運作了！

---

### 第四階段：部署到網際網路 (GitHub Pages)

1.  **上傳到 GitHub**：
    *   在 GitHub 建立一個新的 Repository（儲存庫）。
    *   將你的程式碼 push 到 GitHub。
2.  **設定 Secrets (安全設定)**：
    *   進入 GitHub 儲存庫的 **Settings > Secrets and variables > Actions**。
    *   點擊 **New repository secret**。
    *   **Name**: `VITE_GAS_URL`
    *   **Value**: 貼上您的 GAS 網址。
3.  **啟用自動部署**：
    *   系統已內建 GitHub Actions 腳本（`.github/workflows/deploy.yml`）。
    *   只要你每次 push 程式碼，系統就會自動編譯並發布到 GitHub Pages。
    *   **設定路徑**：進入 Settings > Pages，確認來源是 `gh-pages` 分支。

---

## 🛠️ 系統維護須知

### 1. 修改後端程式碼後
每次在 Google Apps Script 修改完 `Code.gs`，**必須重新部署**：
*   點擊「部署」 > 「管理部署作業」。
*   點擊「編輯（鉛筆）」。
*   版本選「建立新版本」。
*   點擊「部署」。

### 2. EXCEL 批次匯入格式
匯入時請確保 Excel 第一列的標題與 Google Sheets 上的標題完全一致。
*   **常用標題**：任務編號、任務項目、客戶編號、公司行號名稱、承辦、預計完成日、狀態...等。

### 3. 預設帳號
*   初始化後，預設的管理員帳號通常在「群組管理」分頁中。
*   預設帳號：`admin` / 密碼：`admin` (請務必在登入後儘速修改)。

---

## ❓ 常見問題解決

*   **Q: 重新整理網頁出現 404？**
    *   A: 系統已採用 `HashRouter` 模式，網址會帶有 `#` 號，這能避免 GitHub Pages 的路由衝突。請確保是從首頁進入。
*   **Q: 為什麼顯示「連線狀態：🟡 測試模式」？**
    *   A: 代表系統抓不到 `.env` 或 GitHub Secrets 裡的 `VITE_GAS_URL`。請檢查網址是否填寫正確。

---
*本系統由 Antigravity 協助"稅務小豆腐"建置。*
