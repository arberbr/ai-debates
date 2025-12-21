/**
 * Clean up markdown formatting and quotes from a title.
 * @param title - The title to clean.
 * @returns The cleaned title.
 */
export function cleanString(title: string): string {
    let cleaned = title.trim();
    // Clean up markdown formatting and quotes - be aggressive
    // First, remove markdown bold markers (**) - handle patterns like **"text"** or **text**
    cleaned = cleaned.replace(/\*\*/g, '');
    // Remove any remaining single asterisks (*) - but be careful not to remove legitimate asterisks in text
    // Only remove if they're at the start/end or clearly markdown formatting
    cleaned = cleaned.replace(/^\*+|\*+$/g, '');
    // Remove markdown italic markers (_) at start/end
    cleaned = cleaned.replace(/^_+|_+$/g, '');
    // Remove leading/trailing quotes (single or double) - handle multiple quotes and combinations
    cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');
    // Remove any leading/trailing whitespace, colons, dashes that might be leftover formatting
    cleaned = cleaned.replace(/^[\s:-]+|[\s:-]+$/g, '');
    // Final trim
    return cleaned.trim();
}