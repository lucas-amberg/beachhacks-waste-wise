import type { DetectedProduct, ProductScore, ScoreFactor, CartScore, AnalyzedProduct } from '../types'

// ── Grade / Color ──

export function getGrade(score: number): { grade: string; color: string } {
  if (score >= 80) return { grade: 'A', color: '#3b82f6' }
  if (score >= 60) return { grade: 'B', color: '#60a5fa' }
  if (score >= 40) return { grade: 'C', color: '#f87171' }
  if (score >= 20) return { grade: 'D', color: '#ef4444' }
  return { grade: 'F', color: '#dc2626' }
}

// ── Score products via Gemini (through background worker) ──

export async function scoreProducts(products: DetectedProduct[], retailer?: string): Promise<ProductScore[]> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SCORE_PRODUCTS',
      products: products.map(p => ({ name: p.name, brand: p.brand })),
      retailer,
    })

    if (!response?.success || !Array.isArray(response.scores)) {
      throw new Error(response?.error ?? 'No scores returned')
    }

    return response.scores.map((item: { score: number; explanation: string; factors: ScoreFactor[]; alternatives?: Array<{ name: string; reason: string }>; source?: string }) => {
      const score = Math.max(5, Math.min(98, Math.round(item.score)))
      const { grade, color } = getGrade(score)
      return {
        score,
        grade,
        color,
        explanation: item.explanation,
        factors: item.factors ?? [],
        alternatives: item.alternatives ?? [],
        source: (item.source as ProductScore['source']) ?? 'gemini',
      }
    })
  } catch (err) {
    console.error('[WasteWise] Gemini scoring failed, using keyword fallback:', err)
    return products.map(p => scoreWithKeywords(p))
  }
}

// ── Keyword Fallback Scoring ──

const ECO_BRANDS = new Set([
  'seventh generation', 'method', "dr. bronner's", 'dr bronners', 'ecover',
  "mrs. meyer's", 'mrs meyers', 'blueland', 'grove collaborative', 'ethique',
  'bite', 'patagonia', 'allbirds', 'tentree', 'pact', 'who gives a crap',
  'earth breeze', 'branch basics', 'stasher', 'hydro flask', 'klean kanteen',
  'counter culture', 'equal exchange', 'hippeas', 'lesser evil', 'hibar',
  'plaine products', 'leaf shave', 'native', 'pipette', 'naty', 'eco by naty',
  'burt\'s bees', 'tom\'s of maine', 'toms of maine', 'by humankind',
  'meow meow tweet', 'package free', 'public goods', 'grove', 'dropps',
])

const POSITIVE_KEYWORDS: [RegExp, number, string][] = [
  [/\borganic\b/i, 12, 'Organic certification'],
  [/\bfair\s*trade\b/i, 10, 'Fair trade sourcing'],
  [/\brecycled\b/i, 14, 'Made from recycled materials'],
  [/\breusable\b/i, 16, 'Reusable design reduces waste'],
  [/\bbamboo\b/i, 10, 'Sustainable bamboo material'],
  [/\bcompostable\b/i, 14, 'Compostable materials'],
  [/\bbiodegradable\b/i, 12, 'Biodegradable formula'],
  [/\bplant[\s-]?based\b/i, 10, 'Plant-based ingredients'],
  [/\brefill(able)?\b/i, 14, 'Refillable packaging reduces waste'],
  [/\bsolar\b/i, 10, 'Solar-powered production'],
  [/\bnon[\s-]?toxic\b/i, 8, 'Non-toxic formulation'],
  [/\bcruelty[\s-]?free\b/i, 6, 'Cruelty-free product'],
  [/\bvegan\b/i, 6, 'Vegan product'],
  [/\bb[\s-]?corp\b/i, 8, 'B-Corp certified company'],
  [/\bfsc\b/i, 8, 'FSC certified materials'],
  [/\benergy\s*star\b/i, 8, 'Energy Star efficient'],
  [/\brechargeable\b/i, 14, 'Rechargeable — reduces waste'],
  [/\bglass\b/i, 6, 'Glass packaging is recyclable'],
  [/\bstainless\s*steel\b/i, 8, 'Durable stainless steel'],
  [/\bhemp\b/i, 10, 'Sustainable hemp material'],
  [/\bnatural\b/i, 4, 'Natural ingredients'],
]

const NEGATIVE_KEYWORDS: [RegExp, number, string][] = [
  [/\bdisposable\b/i, -16, 'Disposable single-use product'],
  [/\bsingle[\s-]?use\b/i, -16, 'Single-use design creates waste'],
  [/\bplastic\b(?!.*recycled)/i, -8, 'Plastic materials'],
  [/\bsynthetic\b/i, -6, 'Synthetic materials'],
  [/\bbleach(ed)?\b/i, -6, 'Bleached materials'],
  [/\bk[\s-]?cup/i, -12, 'Single-serve pods create waste'],
  [/\bstyrofoam\b/i, -14, 'Styrofoam is not recyclable'],
  [/\bpaper\s*plate/i, -10, 'Disposable paper products'],
  [/\bpaper\s*cup/i, -10, 'Disposable paper products'],
  [/\bplastic\s*wrap\b/i, -12, 'Non-recyclable plastic film'],
  [/\balkaline\s*batter/i, -10, 'Single-use alkaline batteries'],
]

const HIGH_IMPACT_PATTERNS: [RegExp, number, string][] = [
  [/\bbeef\b|\bsteak\b|\bground\s*beef\b/i, -14, 'Beef has high carbon footprint'],
  [/\blamb\b/i, -12, 'Lamb has high carbon emissions'],
  [/\bwater\s*(bottle|pack|case)/i, -12, 'Bottled water — high plastic waste'],
  [/\bdryer\s*sheet/i, -10, 'Dryer sheets are single-use'],
  [/\bpaper\s*towel/i, -8, 'Disposable paper product'],
  [/\btrash\s*bag\b|garbage\s*bag\b/i, -6, 'Plastic waste bags'],
]

function scoreWithKeywords(product: DetectedProduct): ProductScore {
  let score = 50
  const factors: ScoreFactor[] = []
  const text = `${product.name} ${product.brand ?? ''} ${product.keywords.join(' ')}`

  const brandLower = (product.brand ?? '').toLowerCase().trim()
  if (brandLower && ECO_BRANDS.has(brandLower)) {
    score += 15
    factors.push({ label: 'Eco brand', impact: 15, detail: `${product.brand} is a sustainability-focused brand` })
  }

  const allPatterns: [RegExp, number, string][] = [...POSITIVE_KEYWORDS, ...NEGATIVE_KEYWORDS, ...HIGH_IMPACT_PATTERNS]
  for (const [pattern, delta, detail] of allPatterns) {
    if (pattern.test(text)) {
      score += delta
      factors.push({ label: detail, impact: delta, detail })
      // Early exit if score is already at bounds
      if (score <= 5 || score >= 98) break
    }
  }

  score = Math.max(5, Math.min(98, score))
  const { grade, color } = getGrade(score)

  const positives = factors.filter(f => f.impact > 0)
  const negatives = factors.filter(f => f.impact < 0)
  let explanation: string
  if (factors.length === 0) {
    explanation = 'Average sustainability profile. Limited product data available.'
  } else {
    const parts: string[] = []
    if (negatives.length > 0) parts.push(negatives.map(f => f.detail).slice(0, 2).join('. '))
    if (positives.length > 0) parts.push(positives.map(f => f.detail).slice(0, 2).join('. '))
    explanation = parts.join('. ') + '.'
  }

  return { score, grade, color, explanation, factors }
}

// ── Cart score from multiple analyzed products ──

export function calculateCartScore(products: AnalyzedProduct[]): CartScore | null {
  if (products.length === 0) return null

  const totalWeight = products.reduce((sum, p) => {
    const price = p.detected.price ?? 10
    const qty = p.detected.quantity ?? 1
    return sum + price * qty
  }, 0)

  const weightedSum = products.reduce((sum, p) => {
    const price = p.detected.price ?? 10
    const qty = p.detected.quantity ?? 1
    return sum + p.score.score * price * qty
  }, 0)

  const score = Math.round(weightedSum / totalWeight)
  const { grade, color } = getGrade(score)

  return { score, grade, color, totalItems: products.length }
}
