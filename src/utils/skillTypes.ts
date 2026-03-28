export interface Skill {
  id: string
  name: string
  trigger: string
  content: string
  createdBy: string
  createdAt: number
  updatedAt: number
}

export function generateSkillId(): string {
  return 'skill_' + Math.random().toString(36).slice(2, 10)
}

export function validateSkill(data: { name?: string; trigger?: string; content?: string }): string | null {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return 'Name is required.'
  }
  if (data.name.trim().length > 100) {
    return 'Name must be at most 100 characters.'
  }
  if (!data.trigger || typeof data.trigger !== 'string' || data.trigger.trim().length === 0) {
    return 'Trigger is required.'
  }
  if (data.trigger.trim().length > 100) {
    return 'Trigger must be at most 100 characters.'
  }
  if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
    return 'Content is required.'
  }
  if (data.content.trim().length > 10000) {
    return 'Content must be at most 10000 characters.'
  }
  return null
}
