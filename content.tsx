import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

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

interface SelectionInfo {
  text: string
  x: number
  y: number
}

const SelectionIndicator = () => {
  const [selection, setSelection] = useState<SelectionInfo | null>(null)

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const selectedText = window.getSelection()?.toString().trim()

        if (selectedText && selectedText.length > 0) {
          const sel = window.getSelection()
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0)
            const rect = range.getBoundingClientRect()

            const x = rect.left + rect.width / 2
            const y = rect.top - 10

            setSelection({
              text: selectedText,
              x,
              y
            })

            console.log("📖 Selected text:", selectedText)
          }
        }
      }, 10)
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if clicking outside our indicator
      if (!target.closest("[data-reading-indicator]")) {
        setSelection(null)
      }
    }

    const handleScroll = () => {
      setSelection(null)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelection(null)
      }
    }

    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("scroll", handleScroll, true)

    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("scroll", handleScroll, true)
    }
  }, [])

  if (!selection) return null

  const previewText =
    selection.text.length > 50
      ? selection.text.substring(0, 50) + "..."
      : selection.text

  return (
    <div
      data-reading-indicator="true"
      className="fixed z-[2147483647] flex flex-col items-center gap-2 animate-fade-in"
      style={{
        left: selection.x,
        top: selection.y,
        transform: "translate(-50%, -100%)"
      }}>
      {/* Icon Button */}
      <div
        className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full 
                   flex items-center justify-center shadow-lg shadow-purple-500/40 
                   cursor-pointer transition-all duration-200 
                   hover:scale-110 hover:shadow-xl hover:shadow-purple-500/50"
        title="Text selected!">
        <svg
          className="w-5 h-5 fill-white"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
        </svg>
      </div>

      {/* Text Preview */}
      <div
        className="max-w-xs px-3 py-2 bg-gray-900/90 text-white text-xs leading-relaxed 
                   rounded-lg backdrop-blur-md shadow-xl shadow-black/30 
                   whitespace-nowrap overflow-hidden text-ellipsis
                   font-sans">
        {previewText}
      </div>
    </div>
  )
}

export default SelectionIndicator
