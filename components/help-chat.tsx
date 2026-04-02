"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Loader2, Check, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

interface MoodboardImage {
  id: string;
  url: string;
}

interface ClarificationNote {
  index: number;
  original: string;
  refined: string;
  question: string;
  options?: string[];
  imageUrl?: string;
}

interface AlternativeSelection {
  imageId: string;
  imageUrl: string;
  note: string;
}

interface ClarificationContext {
  description: string;
  notes: ClarificationNote[];
  availableImages?: MoodboardImage[];
}

interface CompletenessCheckContext {
  stage: number;
  originalPrompt: string;
  questions: string[];
  isMaskRefinement: boolean;
}

const QUICK_ACTIONS = [
  "How do I refine?",
  "What are angles?",
  "Tips for better results",
];

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Welcome! I can help you with the model generation workflow. Ask me anything about generating faces, refining with masks, or creating angles.",
};

// -- Clarification card shown inline in the chat --

function ClarificationCard({
  note,
  availableImages,
  onSubmit,
  disabled,
}: {
  note: ClarificationNote;
  availableImages?: MoodboardImage[];
  onSubmit: (noteIndex: number, selected: string[], custom: string, alternative?: AlternativeSelection) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [altImage, setAltImage] = useState<MoodboardImage | null>(null);
  const [altNote, setAltNote] = useState("");

  const toggle = (option: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(option) ? next.delete(option) : next.add(option);
      return next;
    });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const alt = altImage && altNote.trim()
      ? { imageId: altImage.id, imageUrl: altImage.url, note: altNote.trim() }
      : undefined;
    onSubmit(note.index, Array.from(selected), custom, alt);
  };

  const hasSelection = selected.size > 0 || custom.trim().length > 0 || (altImage && altNote.trim().length > 0);
  const hasAlternatives = availableImages && availableImages.length > 0;

  return (
    <div className="space-y-2.5 rounded-lg border border-border/60 bg-card/60 p-3">
      {/* Header with reference thumbnail + question */}
      <div className="flex gap-2.5">
        {note.imageUrl && (
          <img
            src={note.imageUrl}
            alt=""
            className="size-12 shrink-0 rounded-md border border-border/40 object-cover"
          />
        )}
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            &ldquo;{note.original}&rdquo;
          </p>
          <p className="text-xs leading-relaxed text-foreground/90">
            {note.question}
          </p>
        </div>
      </div>

      {/* Trait option chips */}
      {note.options && note.options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {note.options.map((option) => {
            const isSelected = selected.has(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => !submitted && toggle(option)}
                disabled={submitted || disabled}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                  isSelected
                    ? "border-blue-500/50 bg-blue-500/15 text-blue-400"
                    : "border-border/60 bg-background/50 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                  (submitted || disabled) && "opacity-60 cursor-default"
                )}
              >
                {isSelected && <Check className="size-2.5" />}
                {option}
              </button>
            );
          })}
        </div>
      )}

      {/* Use another image from moodboard */}
      {!submitted && hasAlternatives && (
        <div className="space-y-1.5">
          {!showAlternatives && !altImage ? (
            <button
              type="button"
              onClick={() => setShowAlternatives(true)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-3" />
              Use a different reference instead
            </button>
          ) : altImage ? (
            <div className="flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-1.5">
              <img
                src={altImage.url}
                alt=""
                className="size-9 shrink-0 rounded border border-blue-500/40 object-cover"
              />
              <input
                type="text"
                value={altNote}
                onChange={(e) => setAltNote(e.target.value)}
                placeholder="What to take? e.g. &quot;the hair&quot;"
                className="flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hasSelection) handleSubmit();
                }}
              />
              <button
                type="button"
                onClick={() => { setAltImage(null); setAltNote(""); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">Pick from moodboard:</p>
                <button
                  type="button"
                  onClick={() => setShowAlternatives(false)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {availableImages!.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => { setAltImage(img); setShowAlternatives(false); }}
                    className="size-10 shrink-0 overflow-hidden rounded-md border border-border/60 transition-all hover:border-blue-500/50 hover:ring-1 hover:ring-blue-500/20"
                  >
                    <img src={img.url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom text + Apply */}
      {!submitted && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Or type something else..."
            disabled={disabled}
            className="flex-1 rounded-md border border-border/60 bg-background/50 px-2 py-1 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && hasSelection) handleSubmit();
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasSelection || disabled}
            className="flex h-6 items-center rounded-md bg-primary px-2 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}

      {submitted && (
        <p className="flex items-center gap-1 text-[11px] text-green-400">
          <Check className="size-3" />
          Updated
        </p>
      )}
    </div>
  );
}

// -- Main chat component --

export function HelpChat({
  context,
  initialMessage,
  forceOpen,
  onOpenChange,
  clarification,
  completenessCheck,
  onNoteSuggestions,
  onAlternativeSelected,
  onEnhancedPromptConfirm,
}: {
  context?: string;
  initialMessage?: string;
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  clarification?: ClarificationContext;
  completenessCheck?: CompletenessCheckContext;
  onNoteSuggestions?: (updates: { index: number; refined: string }[]) => void;
  onAlternativeSelected?: (alt: AlternativeSelection) => void;
  onEnhancedPromptConfirm?: (enhancedPrompt: string) => void;
}) {
  const [open, setOpenState] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const prevInitialRef = useRef<string | undefined>(undefined);
  const prevClarificationRef = useRef<ClarificationContext | undefined>(undefined);
  const prevCompletenessRef = useRef<CompletenessCheckContext | undefined>(undefined);

  const setOpen = useCallback(
    (value: boolean) => {
      setOpenState(value);
      onOpenChange?.(value);
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (forceOpen && !open) setOpen(true);
  }, [forceOpen, open, setOpen]);

  useEffect(() => {
    if (initialMessage && initialMessage !== prevInitialRef.current) {
      prevInitialRef.current = initialMessage;
      setMessages([
        WELCOME_MESSAGE,
        { role: "assistant", content: initialMessage },
      ]);
      setOpen(true);
    }
  }, [initialMessage, setOpen]);

  // Open chat when clarification questions arrive
  useEffect(() => {
    if (clarification && clarification !== prevClarificationRef.current) {
      prevClarificationRef.current = clarification;
      setOpen(true);
    }
  }, [clarification, setOpen]);

  // Open chat when completeness check questions arrive
  useEffect(() => {
    if (completenessCheck && completenessCheck !== prevCompletenessRef.current) {
      prevCompletenessRef.current = completenessCheck;
      setEnhancedPrompt(null);
      const questionsText = completenessCheck.questions
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n");
      setMessages([
        WELCOME_MESSAGE,
        {
          role: "assistant",
          content: `Before generating, a few things could make the result better:\n\n${questionsText}\n\nAnswer these and I'll enhance your prompt.`,
        },
      ]);
      setOpen(true);
    }
  }, [completenessCheck, setOpen]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, clarification, enhancedPrompt]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleOptionSubmit = useCallback(
    async (noteIndex: number, selected: string[], custom: string, alternative?: AlternativeSelection) => {
      const parts = [...selected];
      if (custom.trim()) parts.push(custom.trim());

      let userText = `For reference ${noteIndex + 1}: I want ${parts.join(", ")}`;
      if (alternative) {
        userText += `. Also use a different reference image for: ${alternative.note}`;
        onAlternativeSelected?.(alternative);
      }

      const userMsg: ChatMessage = { role: "user", content: userText };
      const updated = [...messages, userMsg];
      setMessages(updated);
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updated,
            context: "clarification",
            clarification,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.message },
          ]);
          if (data.noteUpdates && onNoteSuggestions) {
            onNoteSuggestions(data.noteUpdates);
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Connection error. Please try again." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, clarification, onNoteSuggestions, onAlternativeSelected]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      const updated = [...messages, userMsg];
      setMessages(updated);
      setInput("");
      setLoading(true);

      try {
        const isCompleteness = !!completenessCheck;
        const chatContext = isCompleteness
          ? "completeness-check"
          : clarification
            ? "clarification"
            : (context ?? "model-generation");

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updated,
            context: chatContext,
            clarification: clarification ?? undefined,
            completenessCheck: isCompleteness ? completenessCheck : undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.message },
          ]);
          if (data.noteUpdates && onNoteSuggestions) {
            onNoteSuggestions(data.noteUpdates);
          }
          if (data.enhancedPrompt) {
            setEnhancedPrompt(data.enhancedPrompt);
          }
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Sorry, I could not process that request. Please try again.",
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Connection error. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, context, clarification, completenessCheck, onNoteSuggestions]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  const hasClarification = clarification && clarification.notes.length > 0;

  return (
    <div className="relative flex h-full shrink-0">
      {/* Collapsed tab */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-full w-7 shrink-0 flex-col items-center border-l border-border/50 bg-card/50 pt-3 transition-all duration-300",
          open && "w-0 overflow-hidden border-l-0 opacity-0",
          !open && "hover:bg-card",
          !open && (clarification || completenessCheck) && "animate-pulse border-blue-500/30 bg-blue-500/5"
        )}
      >
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Panel */}
      <div
        className={cn(
          "flex flex-col border-l border-border/50 bg-card/30 transition-all duration-300 ease-out overflow-hidden",
          open ? "w-80" : "w-0 border-l-0"
        )}
      >
        <div className="flex w-80 min-w-[20rem] items-center justify-between border-b border-border/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-primary to-blue-500">
              <MessageSquare className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Fotograph AI</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={scrollRef} className="w-80 min-w-[20rem] flex-1 overflow-y-auto p-3 space-y-3">
          {/* Clarification cards at the top */}
          {hasClarification && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pick what to keep from each reference
              </p>
              {clarification.notes.map((note) => (
                <ClarificationCard
                  key={note.index}
                  note={note}
                  availableImages={clarification.availableImages}
                  onSubmit={handleOptionSubmit}
                  disabled={loading}
                />
              ))}
            </div>
          )}

          {/* Regular chat messages (skip welcome if we have clarification) */}
          {messages.slice(hasClarification ? 1 : 0).map((msg, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                msg.role === "assistant"
                  ? "bg-primary/10 text-primary"
                  : "ml-auto bg-muted text-foreground"
              )}
            >
              {msg.content}
            </div>
          ))}

          {/* Enhanced prompt review card */}
          {enhancedPrompt && (
            <div className="space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                Enhanced prompt
              </p>
              <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {enhancedPrompt}
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onEnhancedPromptConfirm?.(enhancedPrompt);
                    setEnhancedPrompt(null);
                  }}
                  className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Sparkles className="size-3" />
                  Generate with this
                </button>
                <button
                  type="button"
                  onClick={() => setEnhancedPrompt(null)}
                  className="rounded-md border border-border/60 bg-background/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Thinking...
            </div>
          )}

          {messages.length === 1 && !hasClarification && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => sendMessage(action)}
                  className="rounded-full border border-border/50 bg-primary/5 px-2.5 py-1 text-[11px] text-primary transition-colors hover:bg-primary/10"
                >
                  {action}
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="w-80 min-w-[20rem] border-t border-border/50 p-2">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={completenessCheck ? "Answer the questions above..." : hasClarification ? "Or ask me anything..." : "Ask about this tool..."}
              disabled={loading}
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
