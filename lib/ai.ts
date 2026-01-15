import { google } from "@ai-sdk/google"
import { streamText } from "ai"

import {
  generateExplainPrompt,
  READING_ASSISTANT_SYSTEM_PROMPT
} from "~prompts"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface StreamExplanationParams {
  selectedText: string
  pageTitle: string
  pageContent: string
  messages: Message[]
  onChunk: (text: string) => void
  onComplete: () => void
  onError: (error: Error) => void
}

/**
 * Stream AI explanation for selected text using Vercel AI SDK
 */
export async function streamExplanation(params: StreamExplanationParams) {
  const {
    selectedText,
    pageTitle,
    pageContent,
    messages,
    onChunk,
    onComplete,
    onError
  } = params

  try {
    const isFollowUp = messages.length > 0

    // Build messages array for the AI
    const aiMessages: Array<{ role: "user" | "assistant"; content: string }> =
      []

    if (!isFollowUp) {
      // Initial explanation request
      const initialPrompt = generateExplainPrompt({
        selectedText,
        pageTitle,
        pageContent,
        isFollowUp: false
      })

      aiMessages.push({
        role: "user",
        content: initialPrompt
      })
    } else {
      // Add initial context as first message
      const initialPrompt = generateExplainPrompt({
        selectedText,
        pageTitle,
        pageContent,
        isFollowUp: false
      })

      aiMessages.push({
        role: "user",
        content: initialPrompt
      })

      // Add conversation history
      aiMessages.push(...messages)
    }

    // Stream with Vercel AI SDK
    const result = await streamText({
      model: google("gemini-3-flash-preview"),
      system: READING_ASSISTANT_SYSTEM_PROMPT,
      messages: aiMessages,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: "minimal"
          }
        }
      }
    })

    // Process the stream
    for await (const textPart of result.textStream) {
      onChunk(textPart)
    }

    onComplete()
  } catch (error) {
    console.error("Error streaming explanation:", error)
    onError(error as Error)
  }
}
