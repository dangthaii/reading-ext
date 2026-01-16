import { useCallback, useEffect, useState } from "react"

import { ChatArea, type Message, type TabInfo } from "~components/ChatArea"

// Import Tailwind styles directly for extension pages
import "~style.css"

interface PanelData {
  selectedText: string
  pageTitle: string
  pageContent: string
}

interface TabData {
  id: string
  type: "main" | "explain" | "quote"
  label: string
  context: {
    selectedText: string
    pageTitle: string
    pageContent: string
    parentMessages: Message[]
  }
  quotedText?: string
  // Store messages for each tab to preserve state
  messages: Message[]
  isInitialized: boolean
}

function SidePanel() {
  const [panelData, setPanelData] = useState<PanelData | null>(null)
  const [tabs, setTabs] = useState<TabData[]>([])
  const [activeTabId, setActiveTabId] = useState<string>("main")

  // Listen for panel data from background script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === "PANEL_DATA") {
        setPanelData(message.data)
        // Reset tabs, keep only main
        setTabs([
          {
            id: "main",
            type: "main",
            label: "Main",
            context: {
              selectedText: message.data.selectedText,
              pageTitle: message.data.pageTitle,
              pageContent: message.data.pageContent,
              parentMessages: []
            },
            messages: [],
            isInitialized: false
          }
        ])
        setActiveTabId("main")
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    // Request any pending data on mount
    chrome.runtime.sendMessage({ type: "GET_PANEL_DATA" }, (response) => {
      if (response?.data) {
        setPanelData(response.data)
        setTabs([
          {
            id: "main",
            type: "main",
            label: "Main",
            context: {
              selectedText: response.data.selectedText,
              pageTitle: response.data.pageTitle,
              pageContent: response.data.pageContent,
              parentMessages: []
            },
            messages: [],
            isInitialized: false
          }
        ])
      }
    })

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  // Handle keyboard navigation (Tab key only - when input not focused)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if Tab key pressed and not in an input/textarea
      const target = e.target as HTMLElement
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA"

      if (e.key === "Tab" && !isInputFocused && tabs.length > 1) {
        e.preventDefault()
        e.stopPropagation()

        const currentIndex = tabs.findIndex((t) => t.id === activeTabId)
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + tabs.length) % tabs.length
          : (currentIndex + 1) % tabs.length
        setActiveTabId(tabs[nextIndex].id)
      }
    }

    document.addEventListener("keydown", handleKeyDown, true) // Use capture
    return () => document.removeEventListener("keydown", handleKeyDown, true)
  }, [tabs, activeTabId])

  // Update messages for a specific tab
  const handleMessagesChange = useCallback(
    (tabId: string, messages: Message[]) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId ? { ...t, messages, isInitialized: true } : t
        )
      )
    },
    []
  )

  // Mark tab as initialized (after first API call)
  const handleTabInitialized = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, isInitialized: true } : t))
    )
  }, [])

  // Create a new tab (explain or quote)
  const handleCreateTab = useCallback(
    (type: "explain" | "quote", quotedText: string) => {
      if (!panelData) return

      const activeTab = tabs.find((t) => t.id === activeTabId)
      const newTab: TabData = {
        id: `tab-${Date.now()}`,
        type,
        label: type === "explain" ? "Explain" : "Quote",
        context: {
          selectedText: quotedText,
          pageTitle: panelData.pageTitle,
          pageContent: panelData.pageContent,
          parentMessages: activeTab?.messages || []
        },
        quotedText,
        messages: [],
        isInitialized: false
      }

      setTabs((prev) => [...prev, newTab])
      setActiveTabId(newTab.id)
    },
    [panelData, tabs, activeTabId]
  )

  // Close a tab
  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (tabId === "main") return // Can't close main tab

      setTabs((prev) => prev.filter((t) => t.id !== tabId))

      // If closing active tab, switch to previous tab or main
      if (tabId === activeTabId) {
        const currentIndex = tabs.findIndex((t) => t.id === tabId)
        const newActiveIndex = Math.max(0, currentIndex - 1)
        setActiveTabId(tabs[newActiveIndex]?.id || "main")
      }
    },
    [activeTabId, tabs]
  )

  // Handle explain selection
  const handleExplainSelection = useCallback(
    (text: string) => {
      handleCreateTab("explain", text)
    },
    [handleCreateTab]
  )

  // Handle quote selection
  const handleQuoteSelection = useCallback(
    (text: string) => {
      handleCreateTab("quote", text)
    },
    [handleCreateTab]
  )

  const activeTab = tabs.find((t) => t.id === activeTabId)

  return (
    <div className="flex flex-col h-screen bg-white">
      {panelData && activeTab ? (
        <>
          {/* Chat Area - full height minus tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatArea
              // Remove key to prevent re-mount, instead use tabId prop
              tabId={activeTab.id}
              selectedText={activeTab.context.selectedText}
              pageTitle={activeTab.context.pageTitle}
              pageContent={activeTab.context.pageContent}
              quotedText={activeTab.quotedText}
              mode={activeTab.type === "quote" ? "quote" : "explain"}
              onExplainSelection={handleExplainSelection}
              onQuoteSelection={handleQuoteSelection}
              // Only auto-explain if tab hasn't been initialized yet
              autoExplain={
                activeTab.type !== "quote" && !activeTab.isInitialized
              }
              // Pass stored messages
              initialMessages={activeTab.messages}
              onMessagesChange={(msgs) =>
                handleMessagesChange(activeTab.id, msgs)
              }
              onInitialized={() => handleTabInitialized(activeTab.id)}
              // Pass tabs info for rendering tabs bar
              tabs={tabs}
              activeTabId={activeTabId}
              onTabChange={setActiveTabId}
              onTabClose={handleCloseTab}
            />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-slate-700 mb-2">
              Select text to get started
            </h2>
            <p className="text-sm text-slate-500 max-w-xs">
              Highlight any text on the page and click the icon to get an
              AI-powered explanation.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default SidePanel
