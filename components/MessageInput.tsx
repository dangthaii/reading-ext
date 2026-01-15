import { memo } from "react"

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
}

export const MessageInput = memo(function MessageInput({
  value,
  onChange,
  onSend,
  disabled
}: MessageInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) {
        onSend()
      }
    }
  }

  return (
    <div className="p-4 border-t border-orange-100 bg-white">
      <div className="flex gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a follow-up question... (Enter to send, Shift+Enter for new line)"
          disabled={disabled}
          rows={2}
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl
                     text-slate-800 text-sm placeholder:text-slate-400 resize-none
                     outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="px-5 py-2.5 bg-gradient-to-r from-orange-400 to-red-500 
                     rounded-xl text-white text-sm font-medium
                     hover:from-orange-500 hover:to-red-600
                     transition-all cursor-pointer border-none
                     disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-orange-500/20">
          Send
        </button>
      </div>
    </div>
  )
})
