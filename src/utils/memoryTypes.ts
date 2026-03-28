export interface Memory {
  id: string
  title: string
  content: string
  summary: string
  keywords: string
  pinned: boolean
  createdBy: string
  createdAt: number
  updatedAt: number
  source: string
}

export function generateMemoryId(): string {
  return 'mem_' + Math.random().toString(36).slice(2, 10)
}

export function validateMemory(data: { title?: string; content?: string; summary?: string; keywords?: string }): string | null {
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    return 'Title is required.'
  }
  if (data.title.trim().length > 100) {
    return 'Title must be at most 100 characters.'
  }
  if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
    return 'Content is required.'
  }
  if (data.content.trim().length > 1000) {
    return 'Content must be at most 1000 characters.'
  }
  if (!data.summary || typeof data.summary !== 'string' || data.summary.trim().length === 0) {
    return 'Summary is required.'
  }
  if (data.summary.trim().length > 300) {
    return 'Summary must be at most 300 characters.'
  }
  if (!data.keywords || typeof data.keywords !== 'string' || data.keywords.trim().length === 0) {
    return 'Keywords are required.'
  }
  if (data.keywords.trim().length > 100) {
    return 'Keywords must be at most 100 characters.'
  }
  return null
}
