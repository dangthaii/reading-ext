import {
  autoUpdate,
  flip,
  inline,
  offset,
  shift,
  useFloating
} from "@floating-ui/react"
import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import { useCallback, useEffect, useMemo, useState } from "react"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}

// Inject Tailwind styles into Shadow DOM
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

const ReadingExtension = () => {
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [selectionRange, setSelectionRange] = useState<Range | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelText, setPanelText] = useState("")

  // Create virtual element from selection range
  const virtualElement = useMemo(() => {
    if (!selectionRange) return null
    return {
      getBoundingClientRect: () => selectionRange.getBoundingClientRect(),
      getClientRects: () => selectionRange.getClientRects()
    }
  }, [selectionRange])

  // Use Floating UI for positioning
  const { refs, floatingStyles } = useFloating({
    placement: "top",
    elements: {
      reference: virtualElement
    },
    middleware: [
      inline(),
      offset(10),
      flip({ fallbackPlacements: ["bottom", "top"] }),
      shift({ padding: 8 })
    ],
    whileElementsMounted: autoUpdate
  })

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const sel = window.getSelection()
        const text = sel?.toString().trim()

        if (text && text.length > 0 && sel && sel.rangeCount > 0) {
          setSelectionRange(sel.getRangeAt(0).cloneRange())
          setSelectedText(text)
        }
      }, 10)
    }

    const handleMouseDown = () => {
      setTimeout(() => {
        if (!document.querySelector('[data-plasmo-reading-panel="true"]')) {
          const text = window.getSelection()?.toString().trim()
          if (!text) {
            setSelectedText(null)
            setSelectionRange(null)
          }
        }
      }, 100)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedText(null)
        setSelectionRange(null)
        setIsPanelOpen(false)
      }
    }

    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Handle icon click
  const handleIconClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (selectedText) {
        setPanelText(selectedText)
        setIsPanelOpen(true)
        setSelectedText(null)
        setSelectionRange(null)
      }
    },
    [selectedText]
  )

  // Close panel
  const handleClosePanel = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsPanelOpen(false)
  }, [])

  return (
    <>
      {/* Selection Icon - positioned by Floating UI */}
      {selectedText && virtualElement && (
        <div
          ref={refs.setFloating}
          data-plasmo-reading-icon="true"
          style={floatingStyles}
          className="z-[2147483647] pointer-events-auto">
          <button
            onClick={handleIconClick}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full 
                       flex items-center justify-center shadow-lg shadow-purple-500/40 
                       cursor-pointer border-none outline-none pointer-events-auto
                       hover:scale-110 hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-200"
            title="Chat with AI about this text">
            <svg
              className="w-5 h-5 fill-white pointer-events-none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
            </svg>
          </button>
        </div>
      )}

      {/* Side Panel */}
      {isPanelOpen && (
        <div
          data-plasmo-reading-panel="true"
          className="fixed top-0 right-0 h-screen w-96 z-[2147483647] 
                     bg-slate-900 shadow-2xl shadow-black/50
                     flex flex-col font-sans pointer-events-auto">
          {/* Panel Header */}
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
              <span className="text-white font-medium text-sm">
                AI Assistant
              </span>
            </div>
            <button
              onClick={handleClosePanel}
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

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Selected Text Card */}
            <div className="mb-4">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">
                Selected Text
              </div>
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <p className="text-slate-300 text-sm leading-relaxed m-0 whitespace-pre-wrap">
                  {panelText}
                </p>
              </div>
            </div>

            {/* AI Response Placeholder */}
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">
                AI Response
              </div>
              <div className="p-4 bg-slate-800/30 rounded-xl border border-dashed border-slate-700/50">
                <p className="text-slate-500 text-sm text-center m-0">
                  AI chat coming soon...
                </p>
              </div>
            </div>
          </div>

          {/* Panel Footer - Chat Input */}
          <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask AI about this text..."
                className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl
                           text-white text-sm placeholder:text-slate-500
                           outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500
                           transition-colors"
              />
              <button
                className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 
                           rounded-xl text-white text-sm font-medium
                           hover:from-violet-600 hover:to-purple-700
                           transition-all cursor-pointer border-none">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ReadingExtension
