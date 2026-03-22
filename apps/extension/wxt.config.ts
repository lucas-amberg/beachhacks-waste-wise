import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'WasteWise',
    version: '1.0.0',
    description: 'Sustainability scores & carbon footprint tracking for your grocery cart',
    permissions: ['sidePanel', 'storage', 'activeTab'],
    host_permissions: [
      'https://generativelanguage.googleapis.com/*',
      'http://localhost:8000/*',  // Local agent dev server
      'https://*.agentverse.ai/*',
    ],
    action: {
      default_title: 'Open WasteWise',
    },
    icons: {
      '16': 'icon16.svg',
      '48': 'icon48.svg',
      '128': 'icon128.svg',
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
})
