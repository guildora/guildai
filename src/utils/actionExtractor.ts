export interface ExtractedAction {
  type: string
  params: Record<string, string>
  rawText: string
}

export function extractActions(text: string): ExtractedAction[] {
  const actions: ExtractedAction[] = []
  const pattern = /\[ACTION:\s*(\w+)\]\s*(\{[^}]+\})/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    try {
      const type = match[1]
      const params = JSON.parse(match[2])
      actions.push({
        type,
        params,
        rawText: match[0]
      })
    } catch {
      // Invalid JSON in action params, skip
    }
  }

  return actions
}
