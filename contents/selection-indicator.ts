import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}

// Create and inject styles
const injectStyles = () => {
  const style = document.createElement("style")
  style.id = "reading-ext-styles"
  style.textContent = `
    .reading-indicator {
      position: fixed;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      animation: reading-fadeIn 0.2s ease-out;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .reading-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      cursor: pointer;
      pointer-events: auto;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .reading-icon:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }

    .reading-icon svg {
      width: 20px;
      height: 20px;
      fill: white;
    }

    .reading-text-preview {
      max-width: 300px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      font-size: 12px;
      line-height: 1.4;
      border-radius: 8px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @keyframes reading-fadeIn {
      from {
        opacity: 0;
        transform: translate(-50%, -100%) translateY(10px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -100%) translateY(0);
      }
    }
  `
  document.head.appendChild(style)
}

// Create the indicator element
const createIndicator = (): HTMLDivElement => {
  const indicator = document.createElement("div")
  indicator.id = "reading-indicator"
  indicator.className = "reading-indicator"
  indicator.innerHTML = `
    <div class="reading-icon" title="Text selected!">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>
    </div>
    <div class="reading-text-preview"></div>
  `
  indicator.style.display = "none"
  document.body.appendChild(indicator)
  return indicator
}

// Main logic
const init = () => {
  // Inject styles
  if (!document.getElementById("reading-ext-styles")) {
    injectStyles()
  }

  // Create indicator
  let indicator = document.getElementById("reading-indicator") as HTMLDivElement
  if (!indicator) {
    indicator = createIndicator()
  }

  const textPreview = indicator.querySelector(
    ".reading-text-preview"
  ) as HTMLDivElement

  // Show indicator at position
  const showIndicator = (x: number, y: number, text: string) => {
    const truncatedText =
      text.length > 50 ? text.substring(0, 50) + "..." : text
    textPreview.textContent = truncatedText

    indicator.style.left = `${x}px`
    indicator.style.top = `${y}px`
    indicator.style.transform = "translate(-50%, -100%)"
    indicator.style.display = "flex"

    console.log("📖 Selected text:", text)
  }

  // Hide indicator
  const hideIndicator = () => {
    indicator.style.display = "none"
  }

  // Handle mouse up - check for selection
  const handleMouseUp = () => {
    setTimeout(() => {
      const selection = window.getSelection()
      const selectedText = selection?.toString().trim()

      if (selectedText && selectedText.length > 0 && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()

        // Position: centered above the selection
        const x = rect.left + rect.width / 2
        const y = rect.top - 10

        showIndicator(x, y, selectedText)
      }
    }, 10)
  }

  // Handle mouse down - hide indicator if clicking outside
  const handleMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest("#reading-indicator")) {
      hideIndicator()
    }
  }

  // Handle scroll - hide indicator
  const handleScroll = () => {
    hideIndicator()
  }

  // Add event listeners
  document.addEventListener("mouseup", handleMouseUp)
  document.addEventListener("mousedown", handleMouseDown)
  window.addEventListener("scroll", handleScroll, true)
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
