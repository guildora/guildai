export interface ExtractedAction {
  type: string
  params: Record<string, string>
  rawText: string
}

function extractBalancedJson(text: string, startIndex: number): string | null {
  let depth = 0
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') { depth--; if (depth === 0) return text.slice(startIndex, i + 1) }
  }
  return null
}

export function extractActions(text: string): ExtractedAction[] {
  const actions: ExtractedAction[] = []
  const tagPattern = /\[ACTION:\s*(\w+)\]\s*\{/g
  let match: RegExpExecArray | null

  while ((match = tagPattern.exec(text)) !== null) {
    const jsonStart = match.index + match[0].length - 1
    const json = extractBalancedJson(text, jsonStart)
    if (!json) continue
    try {
      const type = match[1]
      const params = JSON.parse(json)
      const rawText = text.slice(match.index, jsonStart + json.length)
      actions.push({ type, params, rawText })
    } catch {
      // Invalid JSON in action params, skip
    }
  }

  return actions
}
