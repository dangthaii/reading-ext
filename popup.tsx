import { useState } from "react"

import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import "~style.css"

// Use local storage area for consistency
const storage = new Storage({ area: "local" })

function IndexPopup() {
  const [apiKey, setApiKey] = useStorage({
    key: "googleApiKey",
    instance: storage
  })
  const [inputValue, setInputValue] = useState("")
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!inputValue.trim()) {
      alert("Please enter a valid API key")
      return
    }

    console.log("[Popup] Saving API key, length:", inputValue.trim().length)
    setIsLoading(true)
    try {
      await setApiKey(inputValue.trim())
      console.log("[Popup] API key saved successfully")

      // Verify it was saved
      const savedKey = await storage.get("googleApiKey")
      console.log("[Popup] Verified saved key length:", savedKey?.length)

      setIsSaved(true)
    } catch (error) {
      console.error("[Popup] Error saving API key:", error)
    }
    setIsLoading(false)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleClear = async () => {
    setIsLoading(true)
    await setApiKey("")
    setInputValue("")
    setIsSaved(false)
    setIsLoading(false)
  }

  return (
    <div className="w-96 p-6 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
          <svg
            className="w-6 h-6 fill-white"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">
            Reading Extension
          </h1>
          <p className="text-xs text-slate-400">AI-powered reading assistant</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* API Key Settings */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-violet-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            <span className="text-sm font-medium text-white">
              Google AI API Key
            </span>
            {apiKey && (
              <span className="ml-auto text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                ✓ Configured
              </span>
            )}
          </div>

          <input
            type="password"
            value={inputValue || apiKey || ""}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter your Google AI API key"
            className="w-full px-3 py-2 mb-3 bg-slate-900/50 border border-slate-700 rounded-lg
                     text-white text-sm placeholder:text-slate-600
                     outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500
                     transition-colors"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  isSaved
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
                }
                ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}>
              {isLoading ? "..." : isSaved ? "✓ Saved!" : "Save Key"}
            </button>
            {(apiKey || inputValue) && (
              <button
                onClick={handleClear}
                disabled={isLoading}
                className={`px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg text-sm font-medium
                         hover:bg-slate-700 hover:text-white transition-all
                         ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                Clear
              </button>
            )}
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Get your API key
          </a>
        </div>

        {/* How to use */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300">How to use</span>
            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
              Active
            </span>
          </div>
          <ol className="text-xs text-slate-500 leading-relaxed space-y-1">
            <li>1. Enter your Google AI API key above</li>
            <li>2. Select any text on a webpage</li>
            <li>3. Click the reading indicator icon</li>
            <li>4. Chat with AI about the selected text</li>
          </ol>
        </div>

        <div className="flex items-center gap-2 p-3 bg-violet-500/10 rounded-lg border border-violet-500/20">
          <svg
            className="w-4 h-4 text-violet-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs text-violet-300">
            Your API key is stored locally and never sent to our servers
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <p className="text-center text-xs text-slate-500">
          Made with 💜 for better reading
        </p>
      </div>
    </div>
  )
}

export default IndexPopup
