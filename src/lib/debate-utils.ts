/**
 * Utility functions for debate-related operations
 */

/**
 * Cleans markdown formatting from titles
 */
export function cleanString(title: string): string {
  let cleaned = title.trim()
  // Remove markdown bold markers (**)
  cleaned = cleaned.replace(/\*\*/g, '')
  // Remove single asterisks at start/end
  cleaned = cleaned.replace(/^\*+|\*+$/g, '')
  // Remove markdown italic markers at start/end
  cleaned = cleaned.replace(/^_+|_+$/g, '')
  // Remove leading/trailing quotes
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '')
  // Remove any leading/trailing whitespace
  return cleaned.trim()
}

