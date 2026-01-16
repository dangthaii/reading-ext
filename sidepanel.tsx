import { useCallback, useEffect, useRef, useState } from "react"

import { MessageInput } from "~components/MessageInput"
import { MessagesArea } from "~components/MessagesArea"
import { streamExplanation } from "~lib/ai"

// Import Tailwind styles directly for extension pages
import "~style.css"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface PanelData {
  selectedText: string
  pageTitle: string
  pageContent: string
}

function SidePanel() {
  const [panelData, setPanelData] = useState<PanelData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [placeholderActive, setPlaceholderActive] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const hasInitializedRef = useRef(false)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight

    if (distanceFromBottom > 80) {
      return
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth"
    })
  }, [])

  useEffect(() => {
    if (placeholderActive) return
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom, placeholderActive])

  const scrollLatestUserMessageIntoView = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const userMessages = container.querySelectorAll<HTMLElement>(
      "[data-message='true'][data-role='user']"
    )

    if (userMessages.length === 0) return

    const latestUserMessage = userMessages[userMessages.length - 1]
    const containerStyles = window.getComputedStyle(container)
    const paddingTop = parseFloat(containerStyles.paddingTop || "0")

    container.scrollTo({
      top: Math.max(latestUserMessage.offsetTop - paddingTop, 0),
      behavior: "smooth"
    })
  }, [])

  // Listen for panel data from background script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === "PANEL_DATA") {
        setPanelData(message.data)
        // Reset state for new text
        setMessages([])
        setStreamingContent("")
        setPlaceholderActive(false)
        hasInitializedRef.current = false
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    // Request any pending data on mount
    chrome.runtime.sendMessage({ type: "GET_PANEL_DATA" }, (response) => {
      if (response?.data) {
        setPanelData(response.data)
      }
    })

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  // Handle initial explanation
  const handleInitialExplain = useCallback(async () => {
    if (!panelData) return

    setPlaceholderActive(false)
    setIsLoading(true)
    setStreamingContent("")

    try {
      let fullStreamedContent = ""

      await streamExplanation({
        selectedText: panelData.selectedText,
        pageTitle: panelData.pageTitle,
        pageContent: panelData.pageContent,
        messages: [],
        onChunk: (text) => {
          fullStreamedContent += text
          setStreamingContent(fullStreamedContent)
        },
        onComplete: () => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: fullStreamedContent }
          ])
          setStreamingContent("")
          setIsLoading(false)
        },
        onError: (error) => {
          console.error("Error getting explanation:", error)
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Sorry, I encountered an error generating the explanation."
            }
          ])
          setStreamingContent("")
          setIsLoading(false)
        }
      })
    } catch (error) {
      console.error("Error initiating explanation:", error)
      setIsLoading(false)
    }
  }, [panelData])

  // Trigger initial explanation when panel data is received
  useEffect(() => {
    if (panelData && !hasInitializedRef.current) {
      hasInitializedRef.current = true
      handleInitialExplain()
    }
  }, [panelData, handleInitialExplain])

  // Handle sending message
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !panelData) return

    const userMessage: Message = { role: "user", content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setPlaceholderActive(true)
    setMessages(updatedMessages)
    setInput("")
    setIsLoading(true)
    setStreamingContent("")
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollLatestUserMessageIntoView()
      })
    })

    try {
      let fullStreamedContent = ""

      await streamExplanation({
        selectedText: panelData.selectedText,
        pageTitle: panelData.pageTitle,
        pageContent: panelData.pageContent,
        messages: updatedMessages,
        onChunk: (text) => {
          fullStreamedContent += text
          setStreamingContent(fullStreamedContent)
        },
        onComplete: () => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: fullStreamedContent }
          ])
          setStreamingContent("")
          setIsLoading(false)
        },
        onError: (error) => {
          console.error("Error sending message:", error)
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Sorry, I encountered an error processing your question."
            }
          ])
          setStreamingContent("")
          setIsLoading(false)
        }
      })
    } catch (error) {
      console.error("Error initiating message:", error)
      setIsLoading(false)
    }
  }, [input, isLoading, messages, panelData, scrollLatestUserMessageIntoView])

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Main Chat Area */}
      {panelData ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <MessagesArea
            messagesContainerRef={messagesContainerRef}
            selectedText={panelData.selectedText}
            messages={messages}
            streamingContent={streamingContent}
            isLoading={isLoading}
            placeholderActive={placeholderActive}
          />

          <MessageInput
            value={input}
            onChange={setInput}
            onSend={handleSendMessage}
            disabled={isLoading}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-slate-700 mb-2">
              Select text to get started
            </h2>
            <p className="text-sm text-slate-500 max-w-xs">
              Highlight any text on the page and click the icon to get an
              AI-powered explanation.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default SidePanel
