interface Message {
  role: "user" | "assistant"
  content: string
}

interface StreamExplanationParams {
  selectedText: string
  pageTitle: string
  pageContent: string
  messages: Message[]
  // New: mode and quotedText for quote functionality
  mode?: "explain" | "quote"
  quotedText?: string
  // New: inline quote for current tab quoting
  inlineQuote?: string
  onChunk: (text: string) => void
  onComplete: () => void
  onError: (error: Error) => void
}

/**
 * Stream AI explanation for selected text via background script
 */
export async function streamExplanation(params: StreamExplanationParams) {
  const {
    selectedText,
    pageTitle,
    pageContent,
    messages,
    mode = "explain",
    quotedText,
    inlineQuote,
    onChunk,
    onComplete,
    onError
  } = params

  try {
    // Set up message listener for responses from background script
    const messageListener = (message: any) => {
      if (message.type === "AI_CHUNK") {
        onChunk(message.data)
      } else if (message.type === "AI_COMPLETE") {
        chrome.runtime.onMessage.removeListener(messageListener)
        onComplete()
      } else if (message.type === "AI_ERROR") {
        chrome.runtime.onMessage.removeListener(messageListener)
        onError(new Error(message.data))
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    // Send request to background script
    chrome.runtime.sendMessage({
      type: "STREAM_EXPLANATION",
      data: {
        selectedText,
        pageTitle,
        pageContent,
        messages,
        mode,
        quotedText,
        inlineQuote
      }
    })
  } catch (error) {
    console.error("[ContentScript] Error streaming explanation:", error)
    onError(error as Error)
  }
}
