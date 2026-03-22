import type { PageAnalysis, AnalyzedProduct, AnalysisSummary, Recommendation } from '@/types'
import { detectPageType } from '@/content/detector'
import { extractProducts } from '@/content/extractor'
import { scoreProducts, calculateCartScore } from '@/scoring'
import { injectWidget } from '@/content/widget'

function buildSearchUrl(hostname: string, query: string): string {
  const q = encodeURIComponent(query)
  if (hostname.includes('target.com')) return `https://www.target.com/s?searchTerm=${q}`
  if (hostname.includes('amazon.com')) return `https://www.amazon.com/s?k=${q}`
  if (hostname.includes('walmart.com')) return `https://www.walmart.com/search?q=${q}`
  if (hostname.includes('costco.com')) return `https://www.costco.com/CatalogSearch?keyword=${q}`
  if (hostname.includes('kroger.com')) return `https://www.kroger.com/search?query=${q}`
  if (hostname.includes('instacart.com')) return `https://www.instacart.com/store/search/${q}`
  return `https://www.google.com/search?q=${q}+site:${hostname}`
}

export default defineContentScript({
  matches: ['https://*/*', 'http://*/*'],
  runAt: 'document_idle',
  main() {
    let lastAnalysisJson = ''

    async function analyze(): Promise<void> {
      try {
        const pageType = detectPageType()
        console.log('[WasteWise] Page type:', pageType)

        // Only run on shopping-related pages
        if (pageType === 'unknown') return

        const detected = extractProducts(pageType)
        console.log('[WasteWise] Detected', detected.length, 'products')
        if (detected.length === 0) return

        // Send a loading state to the side panel so user sees progress
        try {
          chrome.runtime?.sendMessage({
            type: 'ANALYSIS_UPDATE',
            data: { loading: true, productCount: detected.length },
          })
        } catch { /* not in extension context */ }

        const hostname = window.location.hostname

        // Score all products via AI (Agentverse → Gemini → keyword fallback)
        const scores = await scoreProducts(detected, hostname)
        console.log('[WasteWise] Scores received in content script:', scores.length)

        // Pair scores with products and build recommendations from Gemini alternatives
        const products: AnalyzedProduct[] = detected.map((d, i) => {
          const score = scores[i]
          const alternatives = score.alternatives ?? []
          const recommendations: Recommendation[] = alternatives.map(alt => ({
            alternative: {
              name: alt.name,
              reason: alt.reason,
              searchUrl: buildSearchUrl(hostname, alt.name),
            },
          }))
          return { detected: d, score, recommendations }
        })

        // Cart score for multi-item pages
        const cartScore = (pageType === 'cart' || pageType === 'checkout' || products.length > 1)
          ? calculateCartScore(products)
          : null

        // Summary stats
        const summary: AnalysisSummary = {
          totalProducts: products.length,
          averageScore: Math.round(products.reduce((s, p) => s + p.score.score, 0) / products.length),
          swapsAvailable: products.filter(p => p.recommendations.length > 0).length,
          potentialImprovement: 0,
        }

        const analysis: PageAnalysis = {
          pageType,
          url: window.location.href,
          timestamp: Date.now(),
          products,
          cartScore,
          summary,
        }

        // Deduplicate: don't re-render if nothing changed
        const json = JSON.stringify(analysis)
        if (json === lastAnalysisJson) {
          console.log('[WasteWise] No changes, skipping re-render')
          return
        }
        lastAnalysisJson = json

        // Inject/update the floating widget
        console.log('[WasteWise] Injecting widget with', products.length, 'products')
        injectWidget(analysis)

        // Send to side panel via background
        try {
          chrome.runtime?.sendMessage({ type: 'ANALYSIS_UPDATE', data: analysis })
        } catch { /* not in extension context */ }
      } catch (err) {
        console.error('[WasteWise] analyze() error:', err)
      }
    }

    // Only run when triggered by the extension icon (via background)
    try {
      chrome.runtime?.onMessage?.addListener((msg) => {
        if (msg.type === 'RESCAN') {
          lastAnalysisJson = ''
          analyze()
        }
      })
    } catch { /* not in extension context */ }
  },
})
