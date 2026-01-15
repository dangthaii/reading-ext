export function normalizeApiKey(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("\"") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === "string") {
        const parsedTrimmed = parsed.trim()
        return parsedTrimmed ? parsedTrimmed : null
      }
    } catch {
      // Fall back to raw string when storage contains non-JSON text.
    }
  }

  return trimmed
}
