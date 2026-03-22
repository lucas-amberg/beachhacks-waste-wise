import type { SiteAdapter, DetectedProduct } from '../types'

// ════════════════════════════════════════════
//  AMAZON ADAPTER
// ════════════════════════════════════════════

const amazon: SiteAdapter = {
  name: 'Amazon',
  matches: (url) => /amazon\.(com|co\.|ca|de|fr|it|es|in|co\.jp)/i.test(url),
  extractProducts: (pageType) => {
    if (pageType === 'product') return extractAmazonProduct()
    if (pageType === 'cart') return extractAmazonCart()
    return []
  },
}

function extractAmazonProduct(): DetectedProduct[] {
  const titleEl = document.getElementById('productTitle')
  const name = titleEl?.textContent?.trim()
  if (!name) return []

  const priceWhole = document.querySelector('.a-price .a-price-whole')?.textContent?.replace(/[^0-9.]/g, '')
  const priceFraction = document.querySelector('.a-price .a-price-fraction')?.textContent?.replace(/[^0-9]/g, '')
  const price = priceWhole ? parseFloat(`${priceWhole}${priceFraction ? '.' + priceFraction : ''}`) : undefined

  const brandEl = document.getElementById('bylineInfo')
  const brand = brandEl?.textContent?.trim()?.replace(/^(Visit the |Brand: )/i, '').replace(/ Store$/i, '') || undefined

  const imgEl = document.getElementById('landingImage') as HTMLImageElement | null
  const imageUrl = imgEl?.src ?? undefined

  return [{
    name,
    brand,
    price: isNaN(price!) ? undefined : price,
    imageUrl,
    productUrl: window.location.href,
    keywords: extractKw(name, brand),
    confidence: 'high',
  }]
}

function extractAmazonCart(): DetectedProduct[] {
  const items = document.querySelectorAll('[data-asin].sc-list-item, .sc-list-item')
  const results: DetectedProduct[] = []
  for (const item of items) {
    const nameEl = item.querySelector('.sc-product-title, .sc-item-title-text, a.a-link-normal[class*="title"]') as HTMLElement | null
    const name = nameEl?.textContent?.trim()
    if (!name) continue

    const priceEl = item.querySelector('.sc-product-price, .sc-item-price')
    const rawPrice = priceEl ? parseFloat(priceEl.textContent?.replace(/[^0-9.]/g, '') ?? '') : undefined

    const qtyEl = item.querySelector('input[name*="quantity"], select[name*="quantity"]') as HTMLInputElement | null
    const quantity = qtyEl ? parseInt(qtyEl.value) : 1

    const img = item.querySelector('img') as HTMLImageElement | null

    results.push({
      name,
      price: rawPrice && !isNaN(rawPrice) ? rawPrice : undefined,
      quantity,
      imageUrl: img?.src ?? undefined,
      productUrl: (item.querySelector('a[href*="/dp/"]') as HTMLAnchorElement)?.href ?? undefined,
      keywords: extractKw(name),
      confidence: 'high',
    })
  }
  return results
}

// ════════════════════════════════════════════
//  TARGET ADAPTER
// ════════════════════════════════════════════

const target: SiteAdapter = {
  name: 'Target',
  matches: (url) => /target\.com/i.test(url),
  extractProducts: (pageType) => {
    if (pageType === 'product') return extractTargetProduct()
    if (pageType === 'cart') return extractTargetCart()
    return []
  },
}

function extractTargetProduct(): DetectedProduct[] {
  const titleEl = document.querySelector('[data-test="product-title"], h1[class*="Heading"]')
  const name = titleEl?.textContent?.trim()
  if (!name) return []

  const priceEl = document.querySelector('[data-test="product-price"]')
  const price = priceEl ? parseFloat(priceEl.textContent?.replace(/[^0-9.]/g, '') ?? '') : undefined

  const brandEl = document.querySelector('[data-test="product-brand"], a[class*="BrandLink"]')
  const brand = brandEl?.textContent?.trim() || undefined

  const imgEl = document.querySelector('[data-test="product-image"] img, picture img') as HTMLImageElement | null

  return [{
    name,
    brand,
    price: isNaN(price!) ? undefined : price,
    imageUrl: imgEl?.src ?? undefined,
    productUrl: window.location.href,
    keywords: extractKw(name, brand),
    confidence: 'high',
  }]
}

function extractTargetCart(): DetectedProduct[] {
  const items = document.querySelectorAll('[data-test="cartItem"], [class*="CartItem"]')
  const results: DetectedProduct[] = []
  for (const item of items) {
    const nameEl = item.querySelector('a[class*="Title"], [data-test="cart-item-title"]') as HTMLElement | null
    const name = nameEl?.textContent?.trim()
    if (!name) continue

    const priceEl = item.querySelector('[data-test="cart-item-price"]')
    const rawPrice = priceEl ? parseFloat(priceEl.textContent?.replace(/[^0-9.]/g, '') ?? '') : undefined

    const img = item.querySelector('img') as HTMLImageElement | null

    results.push({
      name,
      price: rawPrice && !isNaN(rawPrice) ? rawPrice : undefined,
      quantity: 1,
      imageUrl: img?.src ?? undefined,
      keywords: extractKw(name),
      confidence: 'high',
    })
  }
  return results
}

// ════════════════════════════════════════════
//  WALMART ADAPTER
// ════════════════════════════════════════════

const walmart: SiteAdapter = {
  name: 'Walmart',
  matches: (url) => /walmart\.com/i.test(url),
  extractProducts: (pageType) => {
    if (pageType === 'product') return extractWalmartProduct()
    return []
  },
}

function extractWalmartProduct(): DetectedProduct[] {
  const titleEl = document.querySelector('[itemprop="name"], h1[class*="prod-ProductTitle"]')
  const name = titleEl?.textContent?.trim()
  if (!name) return []

  const priceEl = document.querySelector('[itemprop="price"], [class*="price-characteristic"]')
  const price = priceEl ? parseFloat(priceEl.textContent?.replace(/[^0-9.]/g, '') ?? '') : undefined

  const brandEl = document.querySelector('[itemprop="brand"], a[class*="brand"]')
  const brand = brandEl?.textContent?.trim() || undefined

  const imgEl = document.querySelector('[data-testid="hero-image"] img, img[class*="product-image"]') as HTMLImageElement | null

  return [{
    name,
    brand,
    price: isNaN(price!) ? undefined : price,
    imageUrl: imgEl?.src ?? undefined,
    productUrl: window.location.href,
    keywords: extractKw(name, brand),
    confidence: 'high',
  }]
}

// ════════════════════════════════════════════
//  ADAPTER REGISTRY
// ════════════════════════════════════════════

const adapters: SiteAdapter[] = [amazon, target, walmart]

export function getAdapter(url: string): SiteAdapter | null {
  return adapters.find(a => a.matches(url)) ?? null
}

// ── Helper ──
function extractKw(name: string, brand?: string | null): string[] {
  return `${name} ${brand ?? ''}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter((w, i, arr) => arr.indexOf(w) === i)
}
