import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 3005,
    },
    base: command === 'serve' ? '/' : (env.VITE_BASE_PATH || '/')
  }
})
