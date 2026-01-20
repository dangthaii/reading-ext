import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { streamText } from "ai"

import { Storage } from "@plasmohq/storage"

import { normalizeApiKey } from "~lib/apiKey"
import { storage, STORAGE_KEYS } from "~lib/storage"
import {
  generateExplainPrompt,
  generateFollowUpPrompt,
  generateQuotePrompt,
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
  mode?: "explain" | "quote"
  quotedText?: string
  inlineQuote?: string
}

// Watch for changes to keep local cache updated (optional, but good for debugging)
storage.watch({
  [STORAGE_KEYS.GOOGLE_API_KEY]: (c) => {}
})

// Note: We don't set openPanelOnActionClick: true because we want the popup to open on action click
// The side panel will only open programmatically when user clicks the floating icon after selecting text

// Store panel data to forward to side panel
let pendingPanelData: {
  selectedText: string
  pageTitle: string
  pageContent: string
} | null = null

// Listen for messages from content script or side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "STREAM_EXPLANATION") {
    // If sender has a tab, it's from content script; otherwise it's from side panel
    const tabId = sender.tab?.id
    const isFromSidePanel = !tabId
    handleStreamExplanation(request.data, tabId, isFromSidePanel)
    // Return true to indicate we'll respond asynchronously
    return true
  }

  // Handle opening side panel with data from content script
  if (request.type === "OPEN_SIDE_PANEL") {
    const tabId = sender.tab?.id
    if (tabId) {
      pendingPanelData = request.data

      // Open the side panel for this tab
      chrome.sidePanel
        .open({ tabId })
        .then(() => {
          // Send data to side panel after a short delay to ensure it's loaded
          setTimeout(() => {
            chrome.runtime.sendMessage({
              type: "PANEL_DATA",
              data: pendingPanelData
            })
          }, 100)
        })
        .catch((error) => {
          console.error("[Background] Error opening side panel:", error)
        })
    }
    return true
  }

  // Handle side panel requesting data
  if (request.type === "GET_PANEL_DATA") {
    sendResponse({ data: pendingPanelData })
    return true
  }
})

async function handleStreamExplanation(
  data: StreamExplanationRequest,
  tabId?: number,
  isFromSidePanel: boolean = false
) {
  // If not from side panel and no tabId, we can't send response
  if (!isFromSidePanel && !tabId) {
    console.error("[Background] No tab ID provided and not from side panel")
    return
  }

  try {
    // Debug: Check raw storage
    if (chrome?.storage?.local) {
      const all = await chrome.storage.local.get(null)
    }

    // Get API key from Plasmo storage
    let apiKey = normalizeApiKey(
      await storage.get<string>(STORAGE_KEYS.GOOGLE_API_KEY)
    )

    if (!apiKey && chrome?.storage?.local) {
      const localResult = await chrome.storage.local.get(
        STORAGE_KEYS.GOOGLE_API_KEY
      )
      apiKey = normalizeApiKey(localResult[STORAGE_KEYS.GOOGLE_API_KEY])
    }

    if (!apiKey && chrome?.storage?.sync) {
      const syncResult = await chrome.storage.sync.get(
        STORAGE_KEYS.GOOGLE_API_KEY
      )
      apiKey = normalizeApiKey(syncResult[STORAGE_KEYS.GOOGLE_API_KEY])
    }

    if (!apiKey) {
      throw new Error(
        "Google API key not configured. Please set it in the extension settings."
      )
    }

    // Create Google AI provider instance with API key
    const google = createGoogleGenerativeAI({
      apiKey
    })

    const {
      selectedText,
      pageTitle,
      pageContent,
      messages,
      mode = "explain",
      quotedText,
      inlineQuote
    } = data
    const isFollowUp = messages.length > 0

    // Build messages array for the AI
    const aiMessages: Array<{ role: "user" | "assistant"; content: string }> =
      []

    if (mode === "quote") {
      // Quote mode: user is asking about specific quoted text
      if (!isFollowUp) {
        // First message in quote mode - need user's question from the last message
        // This shouldn't happen normally since quote mode waits for user input
        // But handle it gracefully
        return
      }

      // Get the last user message as the question
      const lastUserMessage = messages[messages.length - 1]
      const userQuestion =
        lastUserMessage?.role === "user" ? lastUserMessage.content : ""

      // Build conversation history (excluding the last message which is the current question)
      const conversationHistory = messages.slice(0, -1)

      // Generate quote prompt
      const quotePrompt = generateQuotePrompt({
        quotedText: quotedText || selectedText,
        pageTitle,
        pageContent,
        userQuestion,
        conversationHistory:
          conversationHistory.length > 0 ? conversationHistory : undefined
      })

      aiMessages.push({
        role: "user",
        content: quotePrompt
      })
    } else {
      // Explain mode (default)
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
        // Follow-up in explain mode
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
    }

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

    // Helper to safely send messages (handles disconnected tabs/panels)
    const safeSendMessage = (message: object) => {
      try {
        if (isFromSidePanel) {
          // Send to side panel via runtime message
          chrome.runtime.sendMessage(message).catch(() => {
            // Panel disconnected, ignore
          })
        } else if (tabId) {
          // Send to content script via tabs message
          chrome.tabs.sendMessage(tabId, message).catch(() => {
            // Tab disconnected, ignore
          })
        }
      } catch {
        // Disconnected, ignore
      }
    }

    // Send streaming chunks to content script
    let chunkCount = 0
    for await (const textPart of streamResult.textStream) {
      chunkCount++
      safeSendMessage({
        type: "AI_CHUNK",
        data: textPart
      })
    }

    // Send completion message
    safeSendMessage({
      type: "AI_COMPLETE"
    })
  } catch (error) {
    console.error("[Background] Error in background script:", error)
    console.error("[Background] Error details:", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    // Send error to content script or side panel
    const errorMessage = {
      type: "AI_ERROR",
      data: error instanceof Error ? error.message : "Unknown error"
    }

    try {
      if (isFromSidePanel) {
        chrome.runtime.sendMessage(errorMessage).catch(() => {})
      } else if (tabId) {
        chrome.tabs.sendMessage(tabId, errorMessage).catch(() => {})
      }
    } catch {
      // Disconnected, ignore
    }
  }
}
