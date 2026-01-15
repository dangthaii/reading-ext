import "~style.css"

function IndexPopup() {
  return (
    <div className="w-80 p-6 bg-gradient-to-br from-slate-900 to-slate-800">
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
          <p className="text-xs text-slate-400">Track your reading progress</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300">How to use</span>
            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Select any text on a webpage to see the reading indicator appear
            above your selection.
          </p>
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
            Press ESC or click elsewhere to dismiss
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
