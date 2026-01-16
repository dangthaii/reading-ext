import { flip, offset, shift, useFloating } from "@floating-ui/react"
import { memo, useCallback, useEffect, useState } from "react"

interface SelectionPopupProps {
  onExplain: (selectedText: string) => void
  onQuote: (selectedText: string) => void
  onQuoteInPlace?: (selectedText: string) => void
  containerRef: React.RefObject<HTMLDivElement>
}

export const SelectionPopup = memo(function SelectionPopup({
  onExplain,
  onQuote,
  onQuoteInPlace,
  containerRef
}: SelectionPopupProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [selectedText, setSelectedText] = useState("")

  const { refs, floatingStyles, update } = useFloating({
    placement: "top",
    middleware: [offset(8), flip(), shift({ padding: 8 })]
  })

  const updatePosition = useCallback(
    (rect: DOMRect) => {
      // Create a virtual element for positioning
      refs.setReference({
        getBoundingClientRect: () => rect
      })
      // Trigger position update
      update()
    },
    [refs, update]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseUp = () => {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        const selection = window.getSelection()
        const text = selection?.toString().trim()

        if (text && text.length > 0 && selection?.rangeCount) {
          // Check if selection is within the container
          const range = selection.getRangeAt(0)
          const commonAncestor = range.commonAncestorContainer

          if (commonAncestor && container.contains(commonAncestor)) {
            const rect = range.getBoundingClientRect()
            updatePosition(rect)
            setSelectedText(text)
            setIsVisible(true)
          }
        } else {
          setIsVisible(false)
        }
      }, 10)
    }

    const handleMouseDown = (e: MouseEvent) => {
      // Hide popup when clicking outside of it
      const floatingEl = refs.floating.current
      if (floatingEl && !floatingEl.contains(e.target as Node)) {
        setIsVisible(false)
      }
    }

    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.toString().trim() === "") {
        setIsVisible(false)
      }
    }

    container.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("selectionchange", handleSelectionChange)

    return () => {
      container.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("selectionchange", handleSelectionChange)
    }
  }, [containerRef, refs.floating, updatePosition])

  const handleExplain = () => {
    if (selectedText) {
      onExplain(selectedText)
      setIsVisible(false)
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleQuote = () => {
    if (selectedText) {
      onQuote(selectedText)
      setIsVisible(false)
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleQuoteInPlace = () => {
    if (selectedText && onQuoteInPlace) {
      onQuoteInPlace(selectedText)
      setIsVisible(false)
      window.getSelection()?.removeAllRanges()
    }
  }

  if (!isVisible) return null

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="z-50 flex items-center gap-1 p-1 bg-white rounded-lg shadow-lg border border-slate-200">
      {/* Explain Button */}
      <button
        onClick={handleExplain}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 
                   hover:bg-orange-50 hover:text-orange-600 rounded-md transition-colors cursor-pointer border-none bg-transparent"
        title="Explain this (new tab)">
        <svg
          className="w-3.5 h-3.5"
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
        Explain
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-slate-200" />

      {/* Quote Button (new tab) */}
      <button
        onClick={handleQuote}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 
                   hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors cursor-pointer border-none bg-transparent"
        title="Quote in new tab">
        <svg
          className="w-3.5 h-3.5"
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
        Quote
      </button>

      {/* Quote In Place Button (current tab) */}
      {onQuoteInPlace && (
        <>
          <div className="w-px h-4 bg-slate-200" />
          <button
            onClick={handleQuoteInPlace}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 
                       hover:bg-green-50 hover:text-green-600 rounded-md transition-colors cursor-pointer border-none bg-transparent"
            title="Quote in current tab">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Here
          </button>
        </>
      )}
    </div>
  )
})
