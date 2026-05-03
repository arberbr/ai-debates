/**
 * Utility functions for parsing judge evaluation responses.
 * Centralized parsing logic to avoid duplication.
 */

export interface ParsedScores {
  yes: number;
  no: number;
}

/**
 * Parse scores from judge evaluation text.
 * Handles various formats and normalizes scores to 0-100 scale.
 */
export function parseScores(text: string): ParsedScores | undefined {
  // Try multiple patterns for FOR score
  const forPatterns = [
    /FOR:\s*(\d+(?:\.\d+)?)/i,
    /FOR\s+SCORE[:\s]+(\d+(?:\.\d+)?)/i,
    /FOR\s+[:\s]+(\d+(?:\.\d+)?)/i,
    /FOR\s*[:-]\s*(\d+(?:\.\d+)?)/i,
  ];

  // Try multiple patterns for AGAINST score
  const againstPatterns = [
    /AGAINST:\s*(\d+(?:\.\d+)?)/i,
    /AGAINST\s+SCORE[:\s]+(\d+(?:\.\d+)?)/i,
    /AGAINST\s+[:\s]+(\d+(?:\.\d+)?)/i,
    /AGAINST\s*[:-]\s*(\d+(?:\.\d+)?)/i,
  ];

  let forScore: number | null = null;
  let againstScore: number | null = null;

  // Try to find FOR score
  for (const pattern of forPatterns) {
    const match = text.match(pattern);
    if (match) {
      forScore = parseFloat(match[1]);
      break;
    }
  }

  // Try to find AGAINST score
  for (const pattern of againstPatterns) {
    const match = text.match(pattern);
    if (match) {
      againstScore = parseFloat(match[1]);
      break;
    }
  }

  // If we found both scores, normalize them to 0-100 scale
  if (forScore !== null && againstScore !== null) {
    return normalizeScores(forScore, againstScore);
  }

  // Fallback: try to find any two numbers near "FOR" and "AGAINST" keywords
  const forSection = text.match(/FOR[^\n]*?(\d+(?:\.\d+)?)/i);
  const againstSection = text.match(/AGAINST[^\n]*?(\d+(?:\.\d+)?)/i);

  if (forSection && againstSection) {
    const forVal = parseFloat(forSection[1]);
    const againstVal = parseFloat(againstSection[1]);
    return normalizeScores(forVal, againstVal);
  }

  // Last resort: find any two numbers in the SCORES section
  const scoresSection = text.match(/SCORES?:?\s*([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i);
  if (scoresSection) {
    const numbers = scoresSection[1].match(/\b(\d+(?:\.\d+)?)\b/g);
    if (numbers && numbers.length >= 2) {
      const forVal = parseFloat(numbers[0]);
      const againstVal = parseFloat(numbers[1]);
      return normalizeScores(forVal, againstVal);
    }
  }

  return undefined;
}

/**
 * Normalize scores to 0-100 scale.
 */
function normalizeScores(forScore: number, againstScore: number): ParsedScores {
  const maxScore = Math.max(forScore, againstScore);

  // If max score is > 100, assume they're on a different scale and normalize
  if (maxScore > 100) {
    const normalizedFor = (forScore / maxScore) * 100;
    const normalizedAgainst = (againstScore / maxScore) * 100;
    return {
      yes: Math.round(normalizedFor * 100) / 100,
      no: Math.round(normalizedAgainst * 100) / 100,
    };
  }

  // If scores are 0-10, scale to 0-100
  if (maxScore <= 10) {
    return {
      yes: Math.round((forScore / 10) * 100 * 100) / 100,
      no: Math.round((againstScore / 10) * 100 * 100) / 100,
    };
  }

  // Already in 0-100 range, return as-is
  return {
    yes: Math.round(forScore * 100) / 100,
    no: Math.round(againstScore * 100) / 100,
  };
}

/**
 * Parse winner from judge evaluation text.
 */
export function parseWinner(text: string): 'yes' | 'no' | 'tie' | undefined {
  const upperText = text.toUpperCase();

  // Check for explicit winner declarations
  if (upperText.includes('WINNER: FOR') || upperText.includes('WINNER:FOR')) {
    return 'yes';
  }
  if (
    upperText.includes('WINNER: AGAINST') ||
    upperText.includes('WINNER:AGAINST')
  ) {
    return 'no';
  }
  if (upperText.includes('WINNER: TIE') || upperText.includes('WINNER:TIE')) {
    return 'tie';
  }

  // Fallback: check for keywords
  if (upperText.includes('FOR WINS') || upperText.includes('FOR WON')) {
    return 'yes';
  }
  if (upperText.includes('AGAINST WINS') || upperText.includes('AGAINST WON')) {
    return 'no';
  }
  if (upperText.includes('TIE') || upperText.includes('DRAW')) {
    return 'tie';
  }

  return undefined;
}

/**
 * Extract reasoning section from evaluation text.
 */
export function extractReasoning(text: string): string {
  const reasoningMatch = text.match(/REASONING:\s*(.+)/is);
  if (reasoningMatch) {
    return reasoningMatch[1].trim();
  }
  return text; // Return full text if no reasoning section found
}
