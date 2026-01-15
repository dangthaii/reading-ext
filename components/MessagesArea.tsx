import { marked } from "marked"
import { memo, useMemo } from "react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface MessagesAreaProps {
  selectedText: string
  messages: Message[]
  streamingContent: string
  isLoading: boolean
  messagesContainerRef: React.RefObject<HTMLDivElement>
}

export const MessagesArea = memo(function MessagesArea({
  selectedText,
  messages,
  streamingContent,
  isLoading,
  messagesContainerRef
}: MessagesAreaProps) {
  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
      {/* Selected Text Info */}
      <div>
        <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">
          Selected Text
        </div>
        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
          <p className="text-slate-700 text-sm leading-relaxed m-0 whitespace-pre-wrap italic">
            "{selectedText}"
          </p>
        </div>
      </div>

      {/* Conversation Messages */}
      {messages.map((message, index) => (
        <div
          key={index}
          data-message="true"
          data-role={message.role}
          className={`flex ${
            message.role === "user" ? "justify-end" : "justify-start"
          }`}>
          {message.role === "user" ? (
            <div className="max-w-[85%] rounded-lg p-3 bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-sm shadow-orange-500/20">
              <div className="whitespace-pre-wrap text-sm">
                {message.content}
              </div>
            </div>
          ) : (
            <div
              className="prose prose-slate prose-sm max-w-none w-full bg-white rounded-xl p-4   shadow-sm"
              dangerouslySetInnerHTML={{
                __html: marked(message.content) as string
              }}
            />
          )}
        </div>
      ))}

      {/* Streaming Message */}
      {isLoading && streamingContent && (
        <div
          className="flex justify-start"
          data-message="true"
          data-role="assistant">
          <div
            className="prose prose-slate prose-sm max-w-none w-full bg-white rounded-xl p-4   shadow-sm"
            dangerouslySetInnerHTML={{
              __html: marked(streamingContent) as string
            }}
          />
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && !streamingContent && (
        <div className="flex justify-start">
          <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-1  ">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
            <span
              className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            />
            <span
              className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
        </div>
      )}
    </div>
  )
})
