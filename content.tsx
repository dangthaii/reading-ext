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
          const range = sel.getRangeAt(0).cloneContents()
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
          style={{
            ...floatingStyles,
            zIndex: 2147483647,
            pointerEvents: "auto"
          }}>
          <button
            onClick={handleIconClick}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: "36px",
              height: "36px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
              cursor: "pointer",
              border: "none",
              outline: "none",
              pointerEvents: "auto"
            }}
            title="Chat with AI about this text">
            <svg
              style={{
                width: "20px",
                height: "20px",
                fill: "white",
                pointerEvents: "none"
              }}
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
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            height: "100vh",
            width: "384px",
            zIndex: 2147483647,
            background: "#0f172a",
            boxShadow: "-4px 0 30px rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            pointerEvents: "auto"
          }}>
          {/* Panel Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid rgba(51, 65, 85, 0.5)",
              background: "rgba(30, 41, 59, 0.5)"
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                <svg
                  style={{ width: "16px", height: "16px", fill: "white" }}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                </svg>
              </div>
              <span
                style={{ color: "white", fontWeight: 500, fontSize: "14px" }}>
                AI Assistant
              </span>
            </div>
            <button
              onClick={handleClosePanel}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                color: "#94a3b8",
                background: "transparent",
                border: "none",
                cursor: "pointer"
              }}>
              <svg
                style={{ width: "20px", height: "20px", pointerEvents: "none" }}
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
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {/* Selected Text Card */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px"
                }}>
                Selected Text
              </div>
              <div
                style={{
                  padding: "16px",
                  background: "rgba(30, 41, 59, 0.5)",
                  borderRadius: "12px",
                  border: "1px solid rgba(51, 65, 85, 0.5)"
                }}>
                <p
                  style={{
                    color: "#cbd5e1",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    margin: 0,
                    whiteSpace: "pre-wrap"
                  }}>
                  {panelText}
                </p>
              </div>
            </div>

            {/* AI Response Placeholder */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px"
                }}>
                AI Response
              </div>
              <div
                style={{
                  padding: "16px",
                  background: "rgba(30, 41, 59, 0.3)",
                  borderRadius: "12px",
                  border: "1px dashed rgba(51, 65, 85, 0.5)"
                }}>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "14px",
                    textAlign: "center",
                    margin: 0
                  }}>
                  AI chat coming soon...
                </p>
              </div>
            </div>
          </div>

          {/* Panel Footer - Chat Input */}
          <div
            style={{
              padding: "16px",
              borderTop: "1px solid rgba(51, 65, 85, 0.5)",
              background: "rgba(30, 41, 59, 0.3)"
            }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Ask AI about this text..."
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
              <button
                style={{
                  padding: "10px 20px",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "12px",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer"
                }}>
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
