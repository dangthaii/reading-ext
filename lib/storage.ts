import { Storage } from "@plasmohq/storage"

// Shared storage instance using 'local' area
// This ensures both popup and background script usage accesses the same storage area
export const storage = new Storage({
  area: "local"
})

export const STORAGE_KEYS = {
  GOOGLE_API_KEY: "googleApiKey"
} as const
