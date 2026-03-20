"use client";

import { useState, useCallback } from "react";
import { Search, Plus, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PinterestResult {
  url: string;
  description: string;
}

interface PinterestResponse {
  results: PinterestResult[];
  fallback?: boolean;
}

interface MoodboardSearchProps {
  onAddImage: (imageUrl: string, description: string) => void;
  projectDescription?: string;
  className?: string;
}

export function MoodboardSearch({
  onAddImage,
  projectDescription,
  className,
}: MoodboardSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PinterestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [searched, setSearched] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setFallback(false);
    setSearched(true);

    try {
      const res = await fetch(
        "/api/moodboard/pinterest?q=" + encodeURIComponent(searchQuery.trim())
      );
      const data: PinterestResponse = await res.json();

      if (data.fallback) {
        setFallback(true);
        setResults([]);
      } else {
        setResults(data.results ?? []);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    performSearch(query);
  }

  function handleSuggest() {
    if (!projectDescription) return;
    setQuery(projectDescription);
    performSearch(projectDescription);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Pinterest"
            className="pl-8"
          />
        </div>
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Search />
          )}
          Search
        </Button>
        {projectDescription && (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleSuggest}
          >
            Suggest
          </Button>
        )}
      </form>

      {fallback && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0" />
          Pinterest not configured. Upload images manually.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && !fallback && searched && results.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No results found. Try a different search term.
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {results.map((result, idx) => (
            <div
              key={`${result.url}-${idx}`}
              className="group relative overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={result.url}
                alt={result.description || "Pinterest result"}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => onAddImage(result.url, result.description)}
                >
                  <Plus />
                </Button>
              </div>
              {result.description && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="line-clamp-2 text-xs text-white">
                    {result.description}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
