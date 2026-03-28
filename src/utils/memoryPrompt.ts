import type { Memory } from './memoryTypes'

const DAY = 86400000
const WEEK = 7 * DAY
const MONTH = 30 * DAY

export function buildMemoriesSection(memories?: Memory[], maxChars: number = 3000): string {
  if (!memories || memories.length === 0) return ''

  const now = Date.now()

  // Pinned first (sorted by createdAt desc), then normal (sorted by createdAt desc)
  const pinned = memories.filter(m => m.pinned).sort((a, b) => b.createdAt - a.createdAt)
  const normal = memories.filter(m => !m.pinned).sort((a, b) => b.createdAt - a.createdAt)
  const sorted = [...pinned, ...normal].slice(0, 50)

  let totalChars = 0
  const lines: string[] = []
  let omitted = 0

  for (const mem of sorted) {
    const age = now - mem.createdAt
    let line: string

    if (mem.pinned) {
      line = `- [pinned] ${mem.title} [id:${mem.id}]: ${mem.content}`
    } else if (age < DAY) {
      line = `- ${mem.title} [id:${mem.id}]: ${mem.content}`
    } else if (age < WEEK) {
      line = `- ${mem.title} [id:${mem.id}]: ${mem.summary}`
    } else if (age < MONTH) {
      line = `- ${mem.title} [id:${mem.id}] (${mem.keywords})`
    } else {
      line = `- ${mem.title} [id:${mem.id}]`
    }

    if (totalChars + line.length + 1 > maxChars) {
      omitted = sorted.length - lines.length
      break
    }

    lines.push(line)
    totalChars += line.length + 1
  }

  if (omitted > 0) {
    lines.push(`... and ${omitted} older memories omitted`)
  }

  return `\n\nGUILD MEMORIES:\nUse these to provide context-aware responses. Do not dump memories unprompted.\n${lines.join('\n')}`
}

export function getMemoryInstructions(): string {
  return `\n\nMEMORY SYSTEM:
You can save important information as memories that persist across all conversations and devices.

WHEN TO SAVE:
- Important community decisions, rules, or policies
- Upcoming events, deadlines, or milestones
- Personal preferences, roles, or responsibilities of members
- Community traditions, recurring events
- When a user explicitly asks you to remember something

WHEN NOT TO SAVE:
- Casual conversation or small talk
- Temporary information ("I'm AFK for 5 minutes")
- Information already saved as a memory
- Sensitive personal data (passwords, private contact info)

HOW TO SAVE:
When you identify something worth remembering, ask: "Soll ich mir das merken?" / "Should I save this as a memory?"
If they agree, use save_memory with ALL fields:
- title: Short descriptive title (max 100 chars)
- content: Full detailed information (max 1000 chars)
- summary: Compressed version with key facts (max 300 chars)
- keywords: Comma-separated keywords (max 100 chars)
- pinned: Set to true for crucial, permanent information (key rules, core facts about the guild). Use false for regular memories.

KEY MEMORIES (pinned):
Key memories are always shown with full details regardless of age. Use pinned: true for:
- Fundamental guild rules or policies
- Core information that should never be compressed
- Information the user explicitly marks as important
Users can also create and manage key memories manually in the Hub.

HOW TO DELETE:
If asked to forget something, find the matching memory ID from the list below and use delete_memory.`
}
