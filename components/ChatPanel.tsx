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
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  // Handle initial explanation
  // Handle initial explanation
  const handleInitialExplain = useCallback(async () => {
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
    setMessages(updatedMessages)
    setInput("")
    setIsLoading(true)
    setStreamingContent("")

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
  }, [input, isLoading, messages, selectedText, pageTitle, pageContent])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 fill-white"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
            </svg>
          </div>
          <span className="text-white font-medium text-sm">AI Assistant</span>
        </div>
        <button
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-8 h-8 flex items-center justify-center rounded-lg 
                     text-slate-400 hover:text-white hover:bg-slate-700/50
                     transition-colors cursor-pointer border-none bg-transparent">
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
      </div>

      {/* Messages Area */}
      <MessagesArea
        messagesContainerRef={messagesContainerRef}
        selectedText={selectedText}
        messages={messages}
        streamingContent={streamingContent}
        isLoading={isLoading}
      />

      {/* Input Area */}
      <MessageInput
        value={input}
        onChange={setInput}
        onSend={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  )
}
