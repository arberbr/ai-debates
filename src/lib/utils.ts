import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates estimated reading time for text content
 * @param content - Text content (can include markdown)
 * @param wordsPerMinute - Average reading speed (default: 200 words/minute)
 * @returns Formatted reading time string (e.g., "5 min read", "1 min read")
 */
export function calculateReadingTime(content: string, wordsPerMinute: number = 200): string {
  if (!content || content.trim().length === 0) {
    return '0 min read'
  }

  // Strip markdown syntax to get plain text
  // Remove markdown headers, bold, italic, links, code blocks, etc.
  const plainText = content
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    // Remove links but keep the text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove list markers
    .replace(/^[*\-+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim()

  // Count words (split by whitespace and filter empty strings)
  const words = plainText.split(/\s+/).filter(word => word.length > 0)
  const wordCount = words.length

  // Calculate reading time in minutes
  const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute))

  return `${minutes} min read`
}

/**
 * Formats a date in 24-hour format
 * @param date - Date object or ISO string
 * @returns Formatted date string (e.g., "12/21/2025 21:01:07")
 */
export function formatDate24Hour(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  const hours = String(dateObj.getHours()).padStart(2, '0')
  const minutes = String(dateObj.getMinutes()).padStart(2, '0')
  const seconds = String(dateObj.getSeconds()).padStart(2, '0')
  
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Calculates total reading time for a debate side (FOR/AGAINST)
 * @param debate - Debate object with openingStatements, debateRounds, and conclusions
 * @param side - 'yes' for FOR side, 'no' for AGAINST side
 * @returns Total reading time as formatted string (e.g., "5 min read")
 */
export function calculateTotalReadingTimeForSide(
  debate: {
    openingStatements?: { yesStatement?: { content: string }; noStatement?: { content: string } }
    debateRounds?: Array<{ yesMessage?: { content: string }; noMessage?: { content: string } }>
    conclusions?: { yesConclusion?: { content: string }; noConclusion?: { content: string } }
  },
  side: 'yes' | 'no'
): string {
  let totalWords = 0
  const wordsPerMinute = 200

  // Helper to count words in content
  const countWords = (content: string | undefined): number => {
    if (!content || content.trim().length === 0) return 0
    
    // Strip markdown syntax (same as calculateReadingTime)
    const plainText = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[*\-+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .replace(/^---+$/gm, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    return plainText.split(/\s+/).filter(word => word.length > 0).length
  }

  // Opening statement
  if (side === 'yes' && debate.openingStatements?.yesStatement?.content) {
    totalWords += countWords(debate.openingStatements.yesStatement.content)
  } else if (side === 'no' && debate.openingStatements?.noStatement?.content) {
    totalWords += countWords(debate.openingStatements.noStatement.content)
  }

  // Debate rounds
  if (debate.debateRounds) {
    for (const round of debate.debateRounds) {
      if (side === 'yes' && round.yesMessage?.content) {
        totalWords += countWords(round.yesMessage.content)
      } else if (side === 'no' && round.noMessage?.content) {
        totalWords += countWords(round.noMessage.content)
      }
    }
  }

  // Conclusion
  if (side === 'yes' && debate.conclusions?.yesConclusion?.content) {
    totalWords += countWords(debate.conclusions.yesConclusion.content)
  } else if (side === 'no' && debate.conclusions?.noConclusion?.content) {
    totalWords += countWords(debate.conclusions.noConclusion.content)
  }

  // Calculate minutes (minimum 1 minute)
  const minutes = Math.max(1, Math.ceil(totalWords / wordsPerMinute))
  return `${minutes} min read`
}
