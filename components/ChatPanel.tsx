import { useCallback, useEffect, useRef, useState } from "react"

import { streamExplanation } from "~lib/ai"

import { MessageInput } from "./MessageInput"
import { MessagesArea } from "./MessagesArea"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ChatPanelProps {
  selectedText: string
  pageTitle: string
  pageContent: string
  onClose: (e: React.MouseEvent) => void
}

export function ChatPanel({
  selectedText,
  pageTitle,
  pageContent,
  onClose
}: ChatPanelProps) {
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

  // Handle initial explanation
  // Handle initial explanation
  const handleInitialExplain = useCallback(async () => {
    setPlaceholderActive(false)
    setIsLoading(true)
    setStreamingContent("")

    try {
      let fullStreamedContent = ""

      await streamExplanation({
        selectedText,
        pageTitle,
        pageContent,
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
  }, [selectedText, pageTitle, pageContent])

  // Send initial explanation when panel opens
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      handleInitialExplain()
    }
  }, [handleInitialExplain])

  // Handle sending message
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

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
        selectedText,
        pageTitle,
        pageContent,
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
  }, [
    input,
    isLoading,
    messages,
    selectedText,
    pageTitle,
    pageContent,
    scrollLatestUserMessageIntoView
  ])

  return (
    <div className="flex flex-col h-full bg-white relative">
      <button
        onClick={onClose}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute top-3 right-3 z-50 w-8 h-8 flex items-center justify-center rounded-full
                   text-slate-400 hover:text-slate-600 hover:bg-slate-100/80
                   transition-all cursor-pointer border-none ">
        <svg
          className="w-5 h-5 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative isolate border border-orange-300 rounded-lg">
        <MessagesArea
          messagesContainerRef={messagesContainerRef}
          selectedText={selectedText}
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
    </div>
  )
}
