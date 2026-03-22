import type { DetectedProduct, PageType } from '../types'
import { getAdapter } from './adapters'

// ════════════════════════════════════════════
//  SCHEMA.ORG / JSON-LD EXTRACTION
// ════════════════════════════════════════════

function extractFromSchemaOrg(): DetectedProduct[] {
  const products: DetectedProduct[] = []
  const scripts = document.querySelectorAll('script[type="application/ld+json"]')

  for (const script of scripts) {
    try {
      const raw = JSON.parse(script.textContent ?? '')
      const items = Array.isArray(raw) ? raw : [raw]

      for (const item of items) {
        if (item['@type'] !== 'Product' && item['@type'] !== 'IndividualProduct') continue

        const name = item.name
        if (!name || isNonProduct(name)) continue

        const offers = item.offers
        let price: number | undefined
        let currency: string | undefined
        if (offers) {
          const offer = Array.isArray(offers) ? offers[0] : offers
          price = parseFloat(offer.price ?? offer.lowPrice ?? '')
          currency = offer.priceCurrency
          if (isNaN(price!)) price = undefined
        }

        const brand = typeof item.brand === 'string' ? item.brand :
          item.brand?.name ?? undefined

        const imageUrl = typeof item.image === 'string' ? item.image :
          Array.isArray(item.image) ? item.image[0] : item.image?.url

        products.push({
          name,
          brand,
          price,
          currency,
          imageUrl,
          productUrl: item.url ?? window.location.href,
          keywords: extractKeywords(name, brand),
          confidence: 'high',
        })
      }
    } catch { /* skip */ }
  }
  return products
}

// ════════════════════════════════════════════
//  OPEN GRAPH EXTRACTION
// ════════════════════════════════════════════

function extractFromOpenGraph(): DetectedProduct | null {
  const ogType = getMeta('og:type')
  const ogTitle = getMeta('og:title')
  if (!ogTitle) return null

  // Only extract if it looks like a product
  const isProduct = ogType === 'product' ||
    ogType === 'og:product' ||
    !!getMeta('product:price:amount')

  if (!isProduct) return null

  const priceStr = getMeta('product:price:amount') ?? getMeta('og:price:amount')
  const price = priceStr ? parseFloat(priceStr) : undefined

  return {
    name: ogTitle,
    brand: getMeta('product:brand') ?? getMeta('og:brand') ?? undefined,
    price: isNaN(price!) ? undefined : price,
    currency: getMeta('product:price:currency') ?? getMeta('og:price:currency') ?? undefined,
    imageUrl: getMeta('og:image') ?? undefined,
    productUrl: getMeta('og:url') ?? window.location.href,
    keywords: extractKeywords(ogTitle),
    confidence: 'medium',
  }
}

// ════════════════════════════════════════════
//  DOM HEURISTIC EXTRACTION — PRODUCT PAGE
// ════════════════════════════════════════════

function extractFromDomProduct(): DetectedProduct | null {
  // Try to find product title
  const titleEl = document.querySelector(
    'h1[class*="product" i], h1[data-testid*="product" i], ' +
    '[id="productTitle"], [class*="product-title" i], [class*="product-name" i], ' +
    'h1[itemprop="name"], [data-automation="product-title"]'
  ) ?? document.querySelector('h1')

  const name = titleEl?.textContent?.trim()
  if (!name || name.length < 3 || name.length > 300) return null

  // Price
  const priceEl = document.querySelector(
    '[class*="price" i]:not([class*="was-price"]):not([class*="original"]), ' +
    '[data-testid*="price" i], [itemprop="price"], ' +
    '[class*="current-price" i], [id*="priceblock" i]'
  )
  const price = priceEl ? parsePrice(priceEl.textContent ?? '') : undefined

  // Brand
  const brandEl = document.querySelector(
    '[itemprop="brand"], [class*="brand" i], [data-testid*="brand" i], ' +
    'a[id="bylineInfo"], [class*="product-brand" i]'
  )
  const brand = brandEl?.textContent?.trim()?.replace(/^(by|brand:?|visit the)\s*/i, '') || undefined

  // Image
  const imgEl = document.querySelector(
    '[class*="product-image" i] img, [id*="landingImage"], ' +
    '[data-testid*="product-image" i] img, [class*="product-media" i] img, ' +
    'img[itemprop="image"]'
  ) as HTMLImageElement | null
  const imageUrl = imgEl?.src ?? imgEl?.getAttribute('data-src') ?? undefined

  return {
    name,
    brand,
    price,
    imageUrl,
    productUrl: window.location.href,
    keywords: extractKeywords(name, brand),
    confidence: 'medium',
  }
}

// ════════════════════════════════════════════
//  DOM HEURISTIC EXTRACTION — CART PAGE
// ════════════════════════════════════════════

function extractFromDomCart(): DetectedProduct[] {
  const products: DetectedProduct[] = []

  // Generic cart item selectors
  const itemSelectors = [
    '[class*="cart-item" i]', '[class*="cart_item" i]',
    '[class*="line-item" i]', '[class*="cartItem" i]',
    '[data-testid*="cart-item" i]', '[data-testid*="cartItem" i]',
    '[class*="basket-item" i]', '[class*="sc-list-item" i]',
    'tr[class*="item" i]',
  ]

  let cartItems: Element[] = []
  for (const selector of itemSelectors) {
    cartItems = Array.from(document.querySelectorAll(selector))
    if (cartItems.length > 0) break
  }

  // Fallback: look for repeated item patterns
  if (cartItems.length === 0) {
    const lists = document.querySelectorAll('ul, ol, [role="list"]')
    for (const list of lists) {
      const children = Array.from(list.children)
      if (children.length >= 2 && children.length <= 30) {
        const allHavePrices = children.every(c => /\$\d/.test(c.textContent ?? ''))
        if (allHavePrices) {
          cartItems = children
          break
        }
      }
    }
  }

  for (const item of cartItems) {
    const text = item.textContent ?? ''
    if (text.trim().length < 5) continue

    // Extract name: look for links or prominent text
    const nameEl = item.querySelector('a[class*="name" i], a[class*="title" i], [class*="item-name" i], [class*="product-name" i], h2, h3, a') as HTMLElement | null
    const name = nameEl?.textContent?.trim()
    if (!name || name.length < 3) continue
    if (isNonProduct(name)) continue

    // Extract price
    const price = parsePrice(text)

    // Extract quantity
    const qtyEl = item.querySelector('input[type="number"], input[name*="qty" i], input[name*="quantity" i], select[name*="qty" i]') as HTMLInputElement | HTMLSelectElement | null
    const qtyText = item.querySelector('[class*="qty" i], [class*="quantity" i]')?.textContent
    let quantity = qtyEl ? parseInt(qtyEl.value) : undefined
    if (!quantity && qtyText) {
      const match = qtyText.match(/(\d+)/)
      quantity = match ? parseInt(match[1]) : undefined
    }

    // Extract image
    const img = item.querySelector('img') as HTMLImageElement | null
    const imageUrl = img?.src ?? img?.getAttribute('data-src') ?? undefined

    // Extract link
    const link = item.querySelector('a[href*="/product"], a[href*="/dp/"], a[href*="/item"], a[href*="/ip/"]') as HTMLAnchorElement | null

    products.push({
      name,
      price,
      quantity: quantity || 1,
      imageUrl,
      productUrl: link?.href ?? undefined,
      keywords: extractKeywords(name),
      confidence: 'low',
    })
  }

  return products
}

// ════════════════════════════════════════════
//  MAIN EXTRACTION ORCHESTRATOR
// ════════════════════════════════════════════

export function extractProducts(pageType: PageType): DetectedProduct[] {
  // 1. Try site-specific adapter first
  const adapter = getAdapter(window.location.href)
  if (adapter) {
    const adapterResults = adapter.extractProducts(pageType)
    if (adapterResults.length > 0) return adapterResults
  }

  // 2. Try schema.org (highest confidence)
  const schemaProducts = extractFromSchemaOrg()
  if (schemaProducts.length > 0) return schemaProducts

  // 3. Based on page type, use appropriate strategy
  if (pageType === 'product') {
    const ogProduct = extractFromOpenGraph()
    if (ogProduct) return [ogProduct]

    const domProduct = extractFromDomProduct()
    if (domProduct) return [domProduct]
  }

  if (pageType === 'cart' || pageType === 'checkout') {
    const cartProducts = extractFromDomCart()
    if (cartProducts.length > 0) return cartProducts
  }

  // 4. Last resort for product pages: try OG + DOM
  const ogProduct = extractFromOpenGraph()
  if (ogProduct) return [ogProduct]

  const domProduct = extractFromDomProduct()
  if (domProduct) return [domProduct]

  return []
}

// ════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════

function getMeta(property: string): string | null {
  const el = document.querySelector(
    `meta[property="${property}"], meta[name="${property}"]`
  ) as HTMLMetaElement | null
  return el?.content ?? null
}

function parsePrice(text: string): number | undefined {
  const match = text.match(/\$\s*([\d,]+\.?\d*)/)
  if (!match) return undefined
  const val = parseFloat(match[1].replace(/,/g, ''))
  return isNaN(val) ? undefined : val
}

// Names that indicate non-product cart elements (fulfillment, fees, etc.)
const NON_PRODUCT_PATTERNS = [
  /^order\s*(pickup|delivery|summary)/i,
  /^(shipping|delivery|handling|tax|subtotal|total|fee|tip)/i,
  /^(pickup|drive\s*up|same\s*day)/i,
  /^(gift\s*card|coupon|promo|discount|savings)/i,
  /^(estimated|order)\s*(tax|total|shipping)/i,
  /^free\s*(shipping|delivery|pickup)/i,
]

function isNonProduct(name: string): boolean {
  return NON_PRODUCT_PATTERNS.some(p => p.test(name.trim()))
}

function extractKeywords(name: string, brand?: string | null): string[] {
  const text = `${name} ${brand ?? ''}`
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter((w, i, arr) => arr.indexOf(w) === i)
}
