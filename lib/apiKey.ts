/**
 * Normalize API key from storage.
 * Plasmo storage may wrap values in JSON, so we need to handle:
 * - Raw strings: "AIza..."
 * - JSON-wrapped strings: "\"AIza...\""
 * - JSON objects (edge case)
 *
 * Also validates that the key only contains ASCII characters valid for HTTP headers.
 */
export function normalizeApiKey(value: unknown): string | null {
  if (value === null || value === undefined) return null

  let result: string | null = null

  // Handle different value types
  if (typeof value === "string") {
    result = value.trim()
  } else if (typeof value === "object") {
    // Plasmo storage might return an object in some cases
    console.warn(
      "[normalizeApiKey] Received object, attempting JSON stringify:",
      value
    )
    try {
      result = JSON.stringify(value)
    } catch {
      return null
    }
  } else {
    return null
  }

  if (!result) return null

  // Try to unwrap JSON-encoded strings (Plasmo sometimes double-encodes)
  // Keep trying until we get a clean string
  let attempts = 0
  while (attempts < 3 && result.startsWith('"') && result.endsWith('"')) {
    try {
      const parsed = JSON.parse(result)
      if (typeof parsed === "string") {
        result = parsed.trim()
        attempts++
      } else {
        break
      }
    } catch {
      break
    }
  }

  // Also handle case where it's wrapped in object like {"googleApiKey": "..."}
  if (result.startsWith("{")) {
    try {
      const parsed = JSON.parse(result)
      if (parsed && typeof parsed === "object") {
        // Check for common key names
        const possibleKeys = ["googleApiKey", "apiKey", "key"]
        for (const key of possibleKeys) {
          if (typeof parsed[key] === "string") {
            result = parsed[key].trim()
            break
          }
        }
      }
    } catch {
      // Not valid JSON object, keep as is
    }
  }

  if (!result) return null

  // Validate: API key should only contain ASCII characters valid for HTTP headers
  // Valid range is 0x20-0x7E (printable ASCII) excluding certain control chars
  const isValidForHeaders = /^[\x20-\x7E]+$/.test(result)
  if (!isValidForHeaders) {
    console.error("[normalizeApiKey] API key contains invalid characters:", {
      length: result.length,
      firstChars: result.substring(0, 10),
      lastChars: result.substring(result.length - 10),
      charCodes: result
        .split("")
        .slice(0, 5)
        .map((c) => c.charCodeAt(0))
    })

    // Try to clean it by removing non-ASCII characters
    const cleaned = result.replace(/[^\x20-\x7E]/g, "")
    if (cleaned && cleaned.length > 10) {
      console.log(
        "[normalizeApiKey] Cleaned API key, new length:",
        cleaned.length
      )
      return cleaned
    }

    return null
  }

  return result
}
