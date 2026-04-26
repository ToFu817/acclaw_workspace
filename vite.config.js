import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 如果部署到 https://<USERNAME>.github.io/<REPO>/，請將 base 設為 '/<REPO>/'
  // 例如：base: '/acclaw_workspace/',
  base: '/',
})
