import { scoreViaAgent } from '@/agentverse/client'
import type { AgentScoreResult } from '@/agentverse/client'

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const GEMINI_KEY_STORAGE = 'wastewise-gemini-key'

let geminiApiKey = ''

async function loadGeminiKey(): Promise<void> {
  // First, try .env file (VITE_GEMINI_API_KEY)
  const envKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (envKey) {
    geminiApiKey = envKey
    console.log('[WasteWise] Gemini API key loaded from .env')
    return
  }

  // Fallback to chrome.storage.sync
  try {
    const data = await chrome.storage.sync.get(GEMINI_KEY_STORAGE)
    geminiApiKey = (data[GEMINI_KEY_STORAGE] as string) ?? ''
    if (geminiApiKey) {
      console.log('[WasteWise] Gemini API key loaded from storage')
    } else {
      console.warn('[WasteWise] No Gemini API key configured — add VITE_GEMINI_API_KEY to apps/extension/.env or run: chrome.storage.sync.set({"wastewise-gemini-key": "YOUR_KEY"})')
    }
  } catch {
    console.warn('[WasteWise] Failed to load Gemini key')
  }
}

function getGeminiUrl(): string {
  return `${GEMINI_BASE_URL}?key=${geminiApiKey}`
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const BATCH_SIZE = 5 // max products per Gemini request
const GEMINI_TIMEOUT_MS = 8000 // 8s — skip and use keyword fallback if slower
const STORAGE_KEY = 'wastewise-score-cache'

// In-memory cache (hot path) — backed by chrome.storage.local (cold path)
const scoreCache = new Map<string, CachedScore>()

interface CachedScore {
  result: GeminiScoreResult
  timestamp: number
}

function cacheKey(product: { name: string; brand?: string }): string {
  return `${(product.name ?? '').toLowerCase().trim()}|${(product.brand ?? '').toLowerCase().trim()}`
}

function isExpired(entry: CachedScore): boolean {
  return Date.now() - entry.timestamp > CACHE_TTL_MS
}

// Load persistent cache into memory on startup
async function loadCache(): Promise<void> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY)
    const stored = (data[STORAGE_KEY] ?? {}) as Record<string, CachedScore>
    let pruned = 0
    for (const [key, entry] of Object.entries(stored)) {
      if (!isExpired(entry)) {
        scoreCache.set(key, entry)
      } else {
        pruned++
      }
    }
    console.log(`[WasteWise] Cache loaded: ${scoreCache.size} entries (${pruned} expired, pruned)`)
  } catch (err) {
    console.warn('[WasteWise] Failed to load cache:', err)
  }
}

// Persist the full in-memory cache to storage
function persistCache(): void {
  const obj: Record<string, CachedScore> = {}
  for (const [key, entry] of scoreCache) {
    if (!isExpired(entry)) obj[key] = entry
  }
  chrome.storage.local.set({ [STORAGE_KEY]: obj })
}

export default defineBackground(() => {
  // Load persistent cache and API key on startup
  loadCache()
  loadGeminiKey()

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

  // Trigger a scan when the user clicks the extension icon
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'RESCAN' })
    }
  })

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'ANALYSIS_UPDATE') {
      chrome.storage.local.set({ 'wastewise-analysis': message.data })
    }

    if (message.type === 'GET_ANALYSIS') {
      chrome.storage.local.get('wastewise-analysis', (result) => {
        sendResponse(result['wastewise-analysis'] || null)
      })
      return true
    }

    if (message.type === 'RESCAN_PAGE') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'RESCAN' })
        }
      })
    }

    if (message.type === 'SCORE_PRODUCTS') {
      const products: Array<{ name: string; brand?: string }> = message.products
      const retailer: string | undefined = message.retailer

      // Check cache — find which products already have fresh scores
      const cached: (GeminiScoreResult | null)[] = products.map(p => {
        const entry = scoreCache.get(cacheKey(p))
        return (entry && !isExpired(entry)) ? entry.result : null
      })
      const uncachedIndices = products.map((_, i) => i).filter(i => !cached[i])

      if (uncachedIndices.length === 0) {
        console.log('[WasteWise] All', products.length, 'products served from cache')
        sendResponse({ success: true, scores: cached })
        return true
      }

      const uncached = uncachedIndices.map(i => products[i])
      console.log('[WasteWise] Scoring', uncached.length, 'products (' + (products.length - uncached.length) + ' cached)...')

      // Three-tier fallback chain: Agentverse → Gemini → Keywords
      scoreWithFallbackChain(uncached, retailer)
        .then(scores => {
          // Merge scores back into the cached array
          for (let j = 0; j < uncachedIndices.length; j++) {
            const i = uncachedIndices[j]
            cached[i] = scores[j]
            scoreCache.set(cacheKey(products[i]), { result: scores[j], timestamp: Date.now() })
          }
          persistCache()
          console.log('[WasteWise] Scores received:', cached)
          sendResponse({ success: true, scores: cached })
        })
        .catch(err => {
          console.error('[WasteWise] All scoring tiers failed, using keyword fallback:', err)
          const fallbackScores = uncached.map(p => keywordFallback(p))
          for (let j = 0; j < uncachedIndices.length; j++) {
            cached[uncachedIndices[j]] = fallbackScores[j]
          }
          sendResponse({ success: true, scores: cached })
        })
      return true // keep sendResponse channel open for async
    }
  })
})

interface GeminiScoreResult {
  score: number
  explanation: string
  factors: Array<{ label: string; impact: number; detail: string }>
  alternatives: Array<{ name: string; reason: string }>
  source?: string // 'agentverse' | 'gemini' | 'keyword'
}

// ════════════════════════════════════════════
//  THREE-TIER FALLBACK CHAIN
// ════════════════════════════════════════════

async function scoreWithFallbackChain(
  products: Array<{ name: string; brand?: string }>,
  retailer?: string,
): Promise<GeminiScoreResult[]> {
  // Tier 1: Agentverse agent (enhanced scoring with eco-database)
  try {
    const agentResults = await scoreViaAgent(products, retailer)
    console.log('[WasteWise] Scored via Agentverse agent')
    return agentResults.map(r => normalizeAgentResult(r, 'agentverse'))
  } catch (err) {
    const isNotConfigured = err instanceof Error && err.message.includes('not configured')
    if (!isNotConfigured) {
      console.warn('[WasteWise] Agentverse agent failed, falling back to Gemini:', err)
    }
  }

  // Tier 2: Direct Gemini (parallel batched, 8s timeout per batch)
  try {
    const geminiResults = await scoreInParallelBatches(products)
    return geminiResults.map(r => ({ ...r, source: 'gemini' as const }))
  } catch (err) {
    console.warn('[WasteWise] Gemini failed entirely, falling back to keywords:', err)
  }

  // Tier 3: Keyword fallback (instant, no network)
  return products.map(p => ({ ...keywordFallback(p), source: 'keyword' as const }))
}

/** Normalize an AgentScoreResult into the GeminiScoreResult shape used downstream. */
function normalizeAgentResult(r: AgentScoreResult, source: string): GeminiScoreResult {
  return {
    score: r.score,
    explanation: r.explanation,
    factors: r.factors ?? [],
    alternatives: r.alternatives ?? [],
    source,
  }
}

// ════════════════════════════════════════════
//  GEMINI PARALLEL BATCHING (TIER 2)
// ════════════════════════════════════════════

async function scoreInParallelBatches(products: Array<{ name: string; brand?: string }>): Promise<GeminiScoreResult[]> {
  // Split into chunks and run concurrently — each batch falls back independently on timeout
  const chunks: Array<{ name: string; brand?: string }>[] = []
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    chunks.push(products.slice(i, i + BATCH_SIZE))
  }

  console.log(`[WasteWise] Scoring ${products.length} products in ${chunks.length} parallel batch(es)`)
  const t0 = performance.now()

  const batchResults = await Promise.all(chunks.map(async (chunk) => {
    try {
      return await scoreWithGemini(chunk)
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'AbortError'
      console.warn(`[WasteWise] Batch of ${chunk.length} ${isTimeout ? 'timed out' : 'failed'}, using keyword fallback`)
      return chunk.map(p => keywordFallback(p))
    }
  }))

  const t1 = performance.now()
  console.log(`[WasteWise] All ${chunks.length} batch(es) completed in ${((t1 - t0) / 1000).toFixed(1)}s`)

  return batchResults.flat()
}

// Lightweight keyword-based scoring as fallback when Gemini is too slow
function keywordFallback(product: { name: string; brand?: string }): GeminiScoreResult {
  let score = 50
  const factors: Array<{ label: string; impact: number; detail: string }> = []
  const text = `${product.name} ${product.brand ?? ''}`.toLowerCase()

  const patterns: [RegExp, number, string][] = [
    [/\borganic\b/i, 12, 'Organic certification'],
    [/\brecycled\b/i, 14, 'Recycled materials'],
    [/\breusable\b/i, 16, 'Reusable design'],
    [/\bcompostable\b/i, 14, 'Compostable materials'],
    [/\bbiodegradable\b/i, 12, 'Biodegradable formula'],
    [/\bdisposable\b/i, -16, 'Disposable single-use'],
    [/\bsingle[\s-]?use\b/i, -16, 'Single-use waste'],
    [/\bplastic\b/i, -8, 'Plastic materials'],
    [/\bbeef\b|\bsteak\b/i, -14, 'High carbon footprint meat'],
    [/\bwater\s*bottle/i, -12, 'Bottled water waste'],
  ]

  for (const [pattern, delta, detail] of patterns) {
    if (pattern.test(text)) {
      score += delta
      factors.push({ label: detail, impact: delta, detail })
      if (score <= 5 || score >= 98) break
    }
  }

  score = Math.max(5, Math.min(98, score))
  return {
    score,
    explanation: 'Estimated from product keywords (AI scoring timed out).',
    factors,
    alternatives: [],
  }
}

async function scoreWithGemini(products: Array<{ name: string; brand?: string }>): Promise<GeminiScoreResult[]> {
  const productList = products.map((p, i) => ({
    index: i,
    name: p.name,
    brand: p.brand ?? 'Unknown',
  }))

  const prompt = `You are a sustainability expert. Rate the environmental sustainability and carbon footprint of these products on a scale of 0 to 100, where 0 is terrible for the environment and 100 is excellent.

Consider factors like:
- Carbon footprint of production and transport
- Packaging waste and recyclability
- Whether the product is reusable vs disposable
- Ingredient sourcing and farming practices
- Brand sustainability commitments
- Product lifecycle and end-of-life impact

For each product, also suggest 1-2 more sustainable alternative products that a shopper could buy instead. Use real product names that would be found at major retailers.

Products to rate:
${JSON.stringify(productList, null, 2)}

Respond with ONLY a JSON array (no markdown, no backticks) in this exact format, one entry per product in the same order:
[
  {
    "score": <number 0-100>,
    "explanation": "<1-2 sentence explanation>",
    "factors": [
      { "label": "<short label>", "impact": <positive or negative number>, "detail": "<brief detail>" }
    ],
    "alternatives": [
      { "name": "<real product name a shopper can search for>", "reason": "<why it's more sustainable>" }
    ]
  }
]`

  const t0 = performance.now()
  console.log('[WasteWise] Sending Gemini request for', products.length, 'products...')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured')
  }

  const response = await fetch(getGeminiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  })

  clearTimeout(timeout)

  const t1 = performance.now()
  console.log(`[WasteWise] Gemini responded in ${((t1 - t0) / 1000).toFixed(1)}s — status: ${response.status}`)

  if (!response.ok) {
    const errBody = await response.text()
    console.error('[WasteWise] Gemini error body:', errBody)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const t2 = performance.now()
  console.log(`[WasteWise] Response parsed in ${((t2 - t1) / 1000).toFixed(1)}s — tokens used:`, data.usageMetadata)

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    console.error('[WasteWise] No text in response:', JSON.stringify(data.candidates?.[0]))
    throw new Error('No response from Gemini')
  }

  const parsed: GeminiScoreResult[] = JSON.parse(text)

  if (!Array.isArray(parsed) || parsed.length !== products.length) {
    throw new Error('Gemini response length mismatch')
  }

  return parsed
}
