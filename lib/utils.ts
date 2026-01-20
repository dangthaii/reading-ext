/**
 * Truncate text to a maximum number of words while preserving original formatting
 */
export function truncateByWords(text: string, maxWords: number): string {
  if (!text) return ""

  // Use regex to find word boundaries (non-whitespace characters)
  const wordRegex = /\S+/g
  let match: RegExpExecArray | null
  let wordCount = 0
  let lastIndex = 0

  while (wordCount < maxWords && (match = wordRegex.exec(text)) !== null) {
    wordCount++
    lastIndex = wordRegex.lastIndex
  }

  if (wordCount < maxWords || lastIndex >= text.length) {
    return text
  }

  return text.slice(0, lastIndex) + "..."
}
