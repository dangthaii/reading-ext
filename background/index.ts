import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { streamText } from "ai"

import { Storage } from "@plasmohq/storage"

import { normalizeApiKey } from "~lib/apiKey"
import {
  generateExplainPrompt,
  READING_ASSISTANT_SYSTEM_PROMPT
} from "~prompts"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface StreamExplanationRequest {
  selectedText: string
  pageTitle: string
  pageContent: string
  messages: Message[]
}

// Initialize storage with local area (same as popup)
const storage = new Storage({ area: "local" })

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "STREAM_EXPLANATION") {
    handleStreamExplanation(request.data, sender.tab?.id)
    // Return true to indicate we'll respond asynchronously
    return true
  }
})

async function handleStreamExplanation(
  data: StreamExplanationRequest,
  tabId?: number
) {
  console.log("[Background] handleStreamExplanation called", { tabId, data })

  if (!tabId) {
    console.error("[Background] No tab ID provided")
    return
  }

  try {
    // Get API key from Plasmo storage
    let apiKey = normalizeApiKey(await storage.get<string>("googleApiKey"))

    if (!apiKey && chrome?.storage?.local) {
      const localResult = await chrome.storage.local.get("googleApiKey")
      apiKey = normalizeApiKey(localResult.googleApiKey)
    }

    if (!apiKey && chrome?.storage?.sync) {
      const syncResult = await chrome.storage.sync.get("googleApiKey")
      apiKey = normalizeApiKey(syncResult.googleApiKey)
    }

    console.log(
      "[Background] API key retrieved:",
      apiKey ? "Yes (length: " + apiKey.length + ")" : "No"
    )

    if (!apiKey) {
      throw new Error(
        "Google API key not configured. Please set it in the extension settings."
      )
    }

    // Create Google AI provider instance with API key
    const google = createGoogleGenerativeAI({
      apiKey
    })
    console.log("[Background] Google AI provider created")

    const { selectedText, pageTitle, pageContent, messages } = data
    const isFollowUp = messages.length > 0
    console.log("[Background] Processing request:", {
      isFollowUp,
      selectedTextLength: selectedText?.length
    })

    // Build messages array for the AI
    const aiMessages: Array<{ role: "user" | "assistant"; content: string }> =
      []

    if (!isFollowUp) {
      // Initial explanation request
      const initialPrompt = generateExplainPrompt({
        selectedText,
        pageTitle,
        pageContent,
        isFollowUp: false
      })

      aiMessages.push({
        role: "user",
        content: initialPrompt
      })
    } else {
      // Add initial context as first message
      const initialPrompt = generateExplainPrompt({
        selectedText,
        pageTitle,
        pageContent,
        isFollowUp: false
      })

      aiMessages.push({
        role: "user",
        content: initialPrompt
      })

      // Add conversation history
      aiMessages.push(...messages)
    }

    // Stream with Vercel AI SDK
    console.log(
      "[Background] Starting streamText with model: gemini-3-flash-preview"
    )
    const streamResult = await streamText({
      model: google("gemini-3-flash-preview"),
      system: READING_ASSISTANT_SYSTEM_PROMPT,
      messages: aiMessages,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: "minimal"
          }
        }
      }
    })
    console.log("[Background] streamText initiated, processing stream...")

    // Send streaming chunks to content script
    let chunkCount = 0
    for await (const textPart of streamResult.textStream) {
      chunkCount++
      chrome.tabs.sendMessage(tabId, {
        type: "AI_CHUNK",
        data: textPart
      })
    }
    console.log("[Background] Stream complete, total chunks:", chunkCount)

    // Send completion message
    chrome.tabs.sendMessage(tabId, {
      type: "AI_COMPLETE"
    })
    console.log("[Background] AI_COMPLETE sent")
  } catch (error) {
    console.error("[Background] Error in background script:", error)
    console.error("[Background] Error details:", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    // Send error to content script
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: "AI_ERROR",
        data: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }
}
