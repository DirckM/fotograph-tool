"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ClarificationNote {
  index: number;
  original: string;
  refined: string;
  question: string;
  options?: string[];
  imageUrl?: string;
}

interface ClarificationContext {
  description: string;
  notes: ClarificationNote[];
  availableImages?: { id: string; url: string }[];
}

interface CompletenessCheckContext {
  stage: number;
  originalPrompt: string;
  questions: { question: string; options: string[] }[];
  isMaskRefinement: boolean;
}

interface HelpChatState {
  clarification?: ClarificationContext;
  completenessCheck?: CompletenessCheckContext;
  onNoteSuggestions?: (updates: { index: number; refined: string }[]) => void;
  onAlternativeSelected?: (alt: { imageId: string; imageUrl: string; note: string }) => void;
  onEnhancedPromptConfirm?: (enhancedPrompt: string) => void;
}

interface HelpChatContextValue extends HelpChatState {
  setChatState: (state: HelpChatState) => void;
  clearChatState: () => void;
}

const HelpChatContext = createContext<HelpChatContextValue>({
  setChatState: () => {},
  clearChatState: () => {},
});

export function HelpChatProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HelpChatState>({});

  const setChatState = useCallback((s: HelpChatState) => setState(s), []);
  const clearChatState = useCallback(() => setState({}), []);

  return (
    <HelpChatContext.Provider value={{ ...state, setChatState, clearChatState }}>
      {children}
    </HelpChatContext.Provider>
  );
}

export function useHelpChat() {
  return useContext(HelpChatContext);
}
