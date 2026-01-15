import {
  autoUpdate,
  flip,
  inline,
  offset,
  shift,
  useFloating
} from "@floating-ui/react"
import cssText from "data-text:~style.css"
import Defuddle from "defuddle"
import type { PlasmoCSConfig } from "plasmo"
import { useCallback, useEffect, useMemo, useState } from "react"
import TurndownService from "turndown"
import { gfm } from "turndown-plugin-gfm"

import { ChatPanel } from "~components/ChatPanel"

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

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
  hr: "---"
})

// Use GFM plugin for tables, strikethrough, and task lists
turndownService.use(gfm)

// Remove script and style tags
turndownService.remove(["script", "style", "noscript", "iframe"])

// Custom rule for preserving code language in fenced code blocks
turndownService.addRule("fencedCodeBlock", {
  filter: function (node, options) {
    return (
      options.codeBlockStyle === "fenced" &&
      node.nodeName === "PRE" &&
      node.firstChild &&
      node.firstChild.nodeName === "CODE"
    )
  },
  replacement: function (content, node, options) {
    const codeNode = node.firstChild as HTMLElement
    const className = codeNode.getAttribute("class") || ""
    const language = (className.match(/language-(\S+)/) || [null, ""])[1]
    const code = codeNode.textContent || ""

    return "\n\n```" + language + "\n" + code.replace(/\n$/, "") + "\n```\n\n"
  }
})

// Custom rule for better image handling
turndownService.addRule("images", {
  filter: "img",
  replacement: function (content, node) {
    const element = node as HTMLImageElement
    const alt = element.alt || ""
    const src = element.src || ""
    const title = element.title ? ` "${element.title}"` : ""

    if (!src) return ""
    return `![${alt}](${src}${title})`
  }
})

interface PageContext {
  title: string
  author: string | null
  description: string | null
  content: string // Markdown content
  htmlContent: string // Original HTML
  wordCount: number
  url: string
}

const ReadingExtension = () => {
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [selectionRange, setSelectionRange] = useState<Range | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelText, setPanelText] = useState("")
  const [pageContext, setPageContext] = useState<PageContext | null>(null)
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

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

  // Parse page content with Defuddle
  const parsePageContent = useCallback(() => {
    try {
      setIsLoadingContext(true)

      // Clone document to avoid modifying original
      const clonedDoc = document.cloneNode(true) as Document

      // Parse with Defuddle
      const defuddle = new Defuddle(clonedDoc)
      const result = defuddle.parse()

      // Convert HTML to Markdown
      const htmlContent = result.content || ""
      const markdownContent = htmlContent
        ? turndownService.turndown(htmlContent)
        : ""

      // Calculate word count from markdown
      const wordCount = markdownContent
        ? markdownContent.split(/\s+/).filter(Boolean).length
        : 0

      setPageContext({
        title: result.title || document.title || "Untitled",
        author: result.author || null,
        description: result.description || null,
        content: markdownContent,
        htmlContent,
        wordCount,
        url: window.location.href
      })
    } catch (error) {
      console.error("Error parsing page:", error)
      // Fallback: just get text content
      const fallbackContent = document.body.innerText
      setPageContext({
        title: document.title || "Untitled",
        author: null,
        description: null,
        content: fallbackContent,
        htmlContent: "",
        wordCount: fallbackContent.split(/\s+/).filter(Boolean).length,
        url: window.location.href
      })
    } finally {
      setIsLoadingContext(false)
    }
  }, [])

  // Copy content to clipboard
  const handleCopyContent = useCallback(async () => {
    if (!pageContext) return

    const fullContent = `# ${pageContext.title}

${pageContext.author ? `**Author:** ${pageContext.author}\n\n` : ""}${pageContext.description ? `> ${pageContext.description}\n\n` : ""}**URL:** ${pageContext.url}
**Words:** ${pageContext.wordCount.toLocaleString()}

---

## Selected Text

${panelText}

---

## Full Page Content

${pageContext.content}
`

    try {
      await navigator.clipboard.writeText(fullContent)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [pageContext, panelText])

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

        // Parse page content when opening panel
        parsePageContent()
      }
    },
    [selectedText, parsePageContent]
  )

  // Close panel
  const handleClosePanel = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsPanelOpen(false)
    setPageContext(null)
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
          className="fixed top-0 right-0 h-screen w-[480px] z-[2147483647] 
                     bg-slate-900 shadow-2xl shadow-black/50
                     flex flex-col font-sans pointer-events-auto">
          {/* Panel Content - AI Chat */}
          <ChatPanel
            selectedText={panelText}
            pageTitle={pageContext?.title || ""}
            pageContent={pageContext?.content || ""}
            onClose={handleClosePanel}
          />
        </div>
      )}
    </>
  )
}

export default ReadingExtension
