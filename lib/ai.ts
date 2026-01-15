interface Message {
  role: "user" | "assistant"
  content: string
}

interface StreamExplanationParams {
  selectedText: string
  pageTitle: string
  pageContent: string
  messages: Message[]
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
    onChunk,
    onComplete,
    onError
  } = params

  console.log("[ContentScript] streamExplanation called", {
    selectedTextLength: selectedText?.length,
    pageTitle,
    messagesCount: messages.length
  })

  try {
    // Set up message listener for responses from background script
    const messageListener = (message: any) => {
      console.log("[ContentScript] Received message:", message.type)
      if (message.type === "AI_CHUNK") {
        onChunk(message.data)
      } else if (message.type === "AI_COMPLETE") {
        console.log("[ContentScript] AI stream complete")
        chrome.runtime.onMessage.removeListener(messageListener)
        onComplete()
      } else if (message.type === "AI_ERROR") {
        console.error("[ContentScript] AI error received:", message.data)
        chrome.runtime.onMessage.removeListener(messageListener)
        onError(new Error(message.data))
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)
    console.log("[ContentScript] Message listener added")

    // Send request to background script
    console.log("[ContentScript] Sending STREAM_EXPLANATION to background")
    chrome.runtime.sendMessage({
      type: "STREAM_EXPLANATION",
      data: {
        selectedText,
        pageTitle,
        pageContent,
        messages
      }
    })
    console.log("[ContentScript] Message sent to background")
  } catch (error) {
    console.error("[ContentScript] Error streaming explanation:", error)
    onError(error as Error)
  }
}
