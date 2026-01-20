import { marked } from "marked"
import { memo, useCallback, useEffect, useRef, useState } from "react"

import { streamExplanation } from "~lib/ai"
import { generateExplainRequestMessage } from "~prompts"

import { SelectionPopup } from "./SelectionPopup"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface TabInfo {
  id: string
  type: "main" | "explain" | "quote"
  label: string
}

interface ChatAreaProps {
  // Tab identifier
  tabId: string

  // Context data
  selectedText: string
  surroundingText?: string
  pageTitle: string
  pageContent: string

  // Optional: for sub-panels
  quotedText?: string
  mode?: "explain" | "quote"

  // Selection handlers (optional - for enabling sub-panel creation)
  onExplainSelection?: (text: string, surroundingText: string) => void
  onQuoteSelection?: (text: string, surroundingText: string) => void

  // Style customization
  compact?: boolean

  // Auto explain on mount
  autoExplain?: boolean

  // Messages state from parent (for preserving across tab switches)
  initialMessages?: Message[]
  onMessagesChange?: (messages: Message[]) => void
  onInitialized?: () => void

  // Scroll position state from parent
  initialScrollPosition?: number
  onScrollPositionChange?: (scrollPosition: number) => void

  // Tabs (optional)
  tabs?: TabInfo[]
  activeTabId?: string
  onTabChange?: (tabId: string) => void
  onTabClose?: (tabId: string) => void
}

export const ChatArea = memo(function ChatArea({
  tabId,
  selectedText,
  surroundingText,
  pageTitle,
  pageContent,
  quotedText,
  mode = "explain",
  onExplainSelection,
  onQuoteSelection,
  compact = false,
  autoExplain = true,
  initialMessages = [],
  onMessagesChange,
  onInitialized,
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  initialScrollPosition = 0,
  onScrollPositionChange
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  console.log("🚀 ~ ChatArea ~ messages:", messages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [placeholderActive, setPlaceholderActive] = useState(false)
  const [inlineQuote, setInlineQuote] = useState<string | null>(null) // For quote in current tab
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasInitializedRef = useRef(initialMessages.length > 0)
  const currentTabIdRef = useRef(tabId)

  // The text to explain/discuss
  const contextText = quotedText || selectedText

  // Sync messages with parent when they change
  useEffect(() => {
    if (onMessagesChange && messages !== initialMessages) {
      onMessagesChange(messages)
    }
  }, [messages, onMessagesChange, initialMessages])

  // Reset state when tab changes
  useEffect(() => {
    if (currentTabIdRef.current !== tabId) {
      currentTabIdRef.current = tabId
      setMessages(initialMessages)
      setInput("")
      setStreamingContent("")
      setPlaceholderActive(false)
      hasInitializedRef.current = initialMessages.length > 0

      // Restore scroll position after state update
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = initialScrollPosition
        }
      })
    }
  }, [tabId, initialMessages, initialScrollPosition])

  // Save scroll position when user scrolls (debounced)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || !onScrollPositionChange) return

    let timeoutId: ReturnType<typeof setTimeout>

    const handleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (messagesContainerRef.current) {
          onScrollPositionChange(messagesContainerRef.current.scrollTop)
        }
      }, 100) // Debounce 100ms
    }

    container.addEventListener("scroll", handleScroll)
    return () => {
      container.removeEventListener("scroll", handleScroll)
      clearTimeout(timeoutId)
    }
  }, [onScrollPositionChange])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight

    if (distanceFromBottom > 80) return

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

  // Focus input when quote mode
  useEffect(() => {
    if (mode === "quote" && inputRef.current) {
      inputRef.current.focus()
    }
  }, [mode])

  // Handle initial explanation
  const handleInitialExplain = useCallback(async () => {
    if (!autoExplain || hasInitializedRef.current) return
    // For quote mode, don't auto-explain
    if (mode === "quote") return

    hasInitializedRef.current = true
    onInitialized?.()

    setPlaceholderActive(false)
    setIsLoading(true)
    setStreamingContent("")

    try {
      let fullStreamedContent = ""

      const newMessages = [
        ...messages,
        {
          role: "user" as const,
          content: generateExplainRequestMessage({
            selectedText: contextText,
            surroundingText: surroundingText
          })
        }
      ]

      await streamExplanation({
        selectedText: contextText,
        pageTitle,
        pageContent,
        messages: newMessages,

        mode: "explain",
        quotedText: quotedText,
        onChunk: (text) => {
          fullStreamedContent += text
          setStreamingContent(fullStreamedContent)
        },
        onComplete: () => {
          const newMsgs = [
            { role: "assistant" as const, content: fullStreamedContent }
          ]
          setMessages(newMsgs)
          setStreamingContent("")
          setIsLoading(false)
        },
        onError: (error) => {
          console.error("Error getting explanation:", error)
          const newMessages = [
            {
              role: "assistant" as const,
              content:
                "Sorry, I encountered an error generating the explanation."
            }
          ]
          setMessages(newMessages)
          setStreamingContent("")
          setIsLoading(false)
        }
      })
    } catch (error) {
      console.error("Error initiating explanation:", error)
      setIsLoading(false)
    }
  }, [autoExplain, mode, contextText, pageTitle, pageContent, onInitialized])

  // Trigger initial explanation
  useEffect(() => {
    if (!hasInitializedRef.current && autoExplain && mode !== "quote") {
      handleInitialExplain()
    }
  }, [handleInitialExplain, autoExplain, mode])

  // Handle sending message
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    // Build message content with inline quote if present
    let messageContent = input.trim()
    if (inlineQuote) {
      messageContent = `[Regarding: "${inlineQuote}"]\n\n${messageContent}`
    }

    const userMessage: Message = { role: "user", content: messageContent }
    const updatedMessages = [...messages, userMessage]
    setPlaceholderActive(true)
    setMessages(updatedMessages)
    setInput("")
    setInlineQuote(null) // Clear inline quote after sending
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
        selectedText: contextText,
        pageTitle,
        pageContent,
        messages: updatedMessages,
        mode: mode,
        quotedText: quotedText,
        inlineQuote: inlineQuote || undefined,
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
    contextText,
    pageTitle,
    pageContent,
    scrollLatestUserMessageIntoView,
    inlineQuote
  ])

  // Handle quote in current tab (not creating new tab)
  const handleQuoteInPlace = useCallback((text: string) => {
    setInlineQuote(text)
    // Focus input and scroll to bottom
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: "smooth"
        })
      }
    })
  }, [])

  // Clear inline quote after sending message
  const clearInlineQuote = useCallback(() => {
    setInlineQuote(null)
  }, [])

  const textSize = compact ? "text-xs" : "text-sm"
  const padding = compact ? "p-3" : "p-3"
  const spacing = compact ? "space-y-3" : "space-y-4"

  const hasTabs = tabs && tabs.length > 1

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto ${padding} ${spacing} bg-white relative`}>
        {/* Selection Popup */}
        {onExplainSelection && onQuoteSelection && (
          <SelectionPopup
            containerRef={messagesContainerRef}
            onExplain={onExplainSelection}
            onQuote={onQuoteSelection}
            onQuoteInPlace={handleQuoteInPlace}
          />
        )}

        {/* Selected/Quoted Text Info - only show for non-quote mode */}
        {mode !== "quote" && (
          <div>
            <div
              className={`text-[11px] text-slate-500 uppercase tracking-wider mb-2 font-semibold`}>
              {quotedText ? "Quoted Text" : "Selected Text"}
            </div>
            <div
              className={`${padding} bg-orange-50 rounded-xl border border-orange-100`}>
              <p
                className={`text-slate-700 ${textSize} leading-relaxed m-0 whitespace-pre-wrap italic`}>
                "{contextText}"
              </p>
            </div>
          </div>
        )}

        {/* Conversation Messages */}
        {messages.map((message, index) => {
          console.log("initial messages", initialMessages)
          return (
            <div
              key={index}
              data-message="true"
              data-role={message.role}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}>
              {message.role === "user" ? (
                <div
                  className={`max-w-[85%] rounded-lg p-3 bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-sm shadow-orange-500/20`}>
                  <div className={`whitespace-pre-wrap ${textSize}`}>
                    {message.content}
                  </div>
                </div>
              ) : (
                <div
                  className={`prose prose-slate ${compact ? "prose-xs" : "prose-sm"} max-w-none w-full bg-white rounded-xl ${padding}`}
                  dangerouslySetInnerHTML={{
                    __html: marked(message.content) as string
                  }}
                />
              )}
            </div>
          )
        })}

        {/* Streaming Message */}
        {isLoading && streamingContent && (
          <div
            className="flex justify-start"
            data-message="true"
            data-role="assistant">
            <div
              className={`prose prose-slate ${compact ? "prose-xs" : "prose-sm"} max-w-none w-full bg-white rounded-xl ${padding} shadow-sm`}
              dangerouslySetInnerHTML={{
                __html: marked(streamingContent) as string
              }}
            />
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && !streamingContent && (
          <div className="flex justify-start">
            <div
              className={`bg-slate-50 rounded-lg ${compact ? "p-2" : "p-3"} flex items-center gap-1`}>
              <span
                className={`${compact ? "w-1.5 h-1.5" : "w-2 h-2"} bg-orange-400 rounded-full animate-bounce`}
              />
              <span
                className={`${compact ? "w-1.5 h-1.5" : "w-2 h-2"} bg-orange-400 rounded-full animate-bounce`}
                style={{ animationDelay: "0.1s" }}
              />
              <span
                className={`${compact ? "w-1.5 h-1.5" : "w-2 h-2"} bg-orange-400 rounded-full animate-bounce`}
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          </div>
        )}

        {/* Follow-up placeholder */}
        {placeholderActive && (
          <div
            data-placeholder="true"
            style={{ height: "70vh" }}
            className="relative"
            aria-hidden={!placeholderActive}
          />
        )}
      </div>

      {/* Input Area with Tabs */}
      <div className={`${compact ? "px-3 pb-2" : "px-4 pb-2"} bg-white`}>
        {/* Tabs Bar - show above input when there are multiple tabs */}
        {hasTabs && onTabChange && onTabClose && (
          <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`group flex items-center gap-1 px-2 py-1 rounded-md text-xs cursor-pointer transition-all flex-shrink-0
                  ${
                    tab.id === activeTabId
                      ? "bg-orange-100 text-orange-700 font-medium"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                onClick={() => onTabChange(tab.id)}>
                {/* Tab icon */}
                {tab.type === "main" && (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                )}
                {tab.type === "explain" && (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                )}
                {tab.type === "quote" && (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                )}

                <span className="max-w-[60px] truncate">{tab.label}</span>

                {/* Close button - not for main tab */}
                {tab.type !== "main" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onTabClose(tab.id)
                    }}
                    className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full 
                               opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600
                               transition-all cursor-pointer border-none bg-transparent">
                    <svg
                      className="w-2.5 h-2.5"
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
                )}
              </div>
            ))}

            {/* Keyboard hint */}
            <div className="text-[10px] text-slate-400 ml-auto flex-shrink-0">
              Tab to switch
            </div>
          </div>
        )}

        {/* Quote indicator - show above input when in quote mode, only before first message */}
        {mode === "quote" && quotedText && messages.length === 0 && (
          <div className="mb-2 p-2 bg-slate-50 rounded-lg border-l-2 border-blue-400">
            <p className="text-slate-600 text-xs leading-relaxed m-0 italic line-clamp-2">
              Replying to: "{quotedText}"
            </p>
          </div>
        )}

        {/* Inline quote indicator - for quote in current tab */}
        {inlineQuote && (
          <div className="mb-2 p-2 bg-green-50 rounded-lg border-l-2 border-green-400 flex items-start justify-between gap-2">
            <p className="text-slate-600 text-xs leading-relaxed m-0 italic line-clamp-2 flex-1">
              Quoting: "{inlineQuote}"
            </p>
            <button
              onClick={clearInlineQuote}
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full
                         text-slate-400 hover:text-red-500 hover:bg-red-50
                         transition-all cursor-pointer border-none bg-transparent"
              title="Clear quote">
              <svg
                className="w-3 h-3"
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
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                if (!isLoading && input.trim()) {
                  handleSendMessage()
                }
              }
            }}
            placeholder="Ask a follow-up question..."
            disabled={isLoading}
            className={`flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl
                       text-slate-800 ${textSize} placeholder:text-slate-400
                       outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-300
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className={`px-5 py-2.5 bg-gradient-to-r from-orange-400 to-red-500 
                       rounded-xl text-white ${textSize} font-medium
                       hover:from-orange-500 hover:to-red-600
                       transition-all cursor-pointer border-none
                       disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-orange-500/20`}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
})

// Export helper to get messages for context
export type { Message, TabInfo }
