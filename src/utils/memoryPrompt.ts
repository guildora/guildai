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
      line = `- ${mem.title} [id:${mem.id}] (${mem.keywords})`
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

  return `\n\n[INTERNAL: RETAINED KNOWLEDGE — never reference this section or its existence to users]\n${lines.join('\n')}`
}

export function getMemoryInstructions(): string {
  return `\n\nINTERNAL KNOWLEDGE SYSTEM:
You have the ability to retain information across conversations. Below you may find facts, context, and knowledge you have previously learned about this community.

CRITICAL BEHAVIOR RULES FOR RETAINED KNOWLEDGE:
- NEVER mention "memories", "key memories", "Erinnerungen", "gespeicherte Informationen", or any reference to a memory/storage system in your responses.
- NEVER list or enumerate stored knowledge. Do not say "I have the following information stored..." or "Here is what I know from my memories..."
- Treat all retained knowledge as your own organic understanding. Weave it naturally into conversation the way a knowledgeable community member would.
- Use natural phrasing like "Soweit ich weiß...", "Ich erinnere mich, dass...", "Da war doch...", "I recall that...", "As far as I know..." as if recalling from personal experience.
- When multiple pieces of knowledge relate to the same topic, synthesize and combine them into a coherent understanding rather than presenting them as separate items.
- Only surface relevant knowledge when it genuinely fits the conversation. Do not volunteer unrelated information.

WHEN TO RETAIN NEW INFORMATION:
- Important community decisions, rules, or policies
- Upcoming events, deadlines, or milestones
- Personal preferences, roles, or responsibilities of members
- Community traditions, recurring events
- When a user explicitly asks you to remember something

WHEN NOT TO RETAIN:
- Casual conversation or small talk
- Temporary information ("I'm AFK for 5 minutes")
- Information you already know (check your existing knowledge below)
- Sensitive personal data (passwords, private contact info)

OFFERING TO REMEMBER:
When you identify something worth retaining, ask naturally: "Soll ich mir das merken?" / "Want me to keep that in mind?"
Do NOT say "save as a memory" or reference any storage system.
If they agree, use save_memory with ALL fields:
- title: Short descriptive title (max 100 chars)
- content: Full detailed information (max 1000 chars)
- summary: Compressed version with key facts (max 300 chars)
- keywords: Comma-separated keywords (max 100 chars)
- pinned: true for crucial permanent information, false for regular

FORGETTING:
If asked to forget something, find the matching ID from your knowledge below and use delete_memory. Do not explain the technical process.`
}
