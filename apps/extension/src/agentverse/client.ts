/**
 * Agentverse HTTP client — communicates with the WasteWise sustainability scoring agent.
 */

const AGENT_TIMEOUT_MS = 10_000
const CONFIG_KEY = 'wastewise-agent-config'

export interface AgentverseConfig {
  /** URL of the scoring agent's /score endpoint */
  scoringAgentUrl: string
  /** Optional Bearer token */
  apiKey: string
  /** Whether to try the agent before falling back to Gemini */
  enabled: boolean
}

const DEFAULT_CONFIG: AgentverseConfig = {
  scoringAgentUrl: 'http://localhost:8000/score',
  apiKey: '',
  enabled: true,
}

export interface AgentScoreResult {
  score: number
  explanation: string
  confidence: string
  data_sources: string[]
  factors: Array<{ label: string; impact: number; detail: string }>
  alternatives: Array<{ name: string; reason: string }>
}

/** Load agent configuration from chrome.storage.sync */
export async function loadAgentverseConfig(): Promise<AgentverseConfig> {
  try {
    const data = await chrome.storage.sync.get(CONFIG_KEY)
    return { ...DEFAULT_CONFIG, ...(data[CONFIG_KEY] ?? {}) }
  } catch {
    return DEFAULT_CONFIG
  }
}

/** Save agent configuration */
export async function saveAgentverseConfig(config: Partial<AgentverseConfig>): Promise<void> {
  const current = await loadAgentverseConfig()
  await chrome.storage.sync.set({ [CONFIG_KEY]: { ...current, ...config } })
}

/** Score products via the Agentverse agent. Throws on failure/timeout. */
export async function scoreViaAgent(
  products: Array<{ name: string; brand?: string }>,
  retailer?: string,
): Promise<AgentScoreResult[]> {
  const config = await loadAgentverseConfig()

  if (!config.enabled || !config.scoringAgentUrl) {
    throw new Error('Agentverse agent not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS)

  try {
    const t0 = performance.now()
    console.log(`[WasteWise] Calling Agentverse agent for ${products.length} products...`)

    const response = await fetch(config.scoringAgentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        products: products.map(p => ({ name: p.name, brand: p.brand })),
        retailer,
      }),
    })

    clearTimeout(timeout)

    const t1 = performance.now()
    console.log(`[WasteWise] Agent responded in ${((t1 - t0) / 1000).toFixed(1)}s — status: ${response.status}`)

    if (!response.ok) {
      const errBody = await response.text()
      console.error('[WasteWise] Agent error body:', errBody)
      throw new Error(`Agent API error: ${response.status}`)
    }

    const data = await response.json()

    if (!Array.isArray(data.scores) || data.scores.length !== products.length) {
      throw new Error('Agent response length mismatch')
    }

    return data.scores as AgentScoreResult[]
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}
