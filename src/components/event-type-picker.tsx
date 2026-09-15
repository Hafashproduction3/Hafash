"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, Check, Sparkles, ChevronDown, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE_GROUPS } from "@/lib/equipment";
import { cn } from "@/lib/utils";

interface EventTypePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export function EventTypePicker({
  value,
  onChange,
  placeholder = "Select event type...",
  className,
  compact = false,
}: EventTypePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mark as mounted (for portal)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dropdown position when opened / scrolled / resized
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return EVENT_TYPE_GROUPS;

    const q = search.trim().toLowerCase();
    const result: Record<string, string[]> = {};

    Object.entries(EVENT_TYPE_GROUPS).forEach(([group, types]) => {
      const matched = types.filter((t) => t.toLowerCase().includes(q));
      if (matched.length > 0) {
        result[group] = matched;
      }
    });

    return result;
  }, [search]);

  const hasResults = Object.keys(filteredGroups).length > 0;

  const handleSelect = useCallback(
    (type: string) => {
      onChange(type);
      setIsOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
      setSearch("");
    },
    [onChange]
  );

  const handleAddCustom = useCallback(() => {
    const trimmed = search.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setIsOpen(false);
    setSearch("");
  }, [search, onChange]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    setSearch("");
  };

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={cn(
          "w-full flex items-center justify-between gap-3 rounded-xl border transition-all text-left",
          compact ? "h-11 px-3 text-sm" : "h-12 px-4",
          "bg-background border-input hover:border-primary/40 focus:outline-none focus:border-primary/50",
          isOpen && "border-primary/50 ring-2 ring-primary/10",
          className
        )}
      >
        <span
          className={cn(
            "flex items-center gap-2 min-w-0 flex-1",
            !value && "text-muted-foreground"
          )}
        >
          {value === "All Events" && (
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
          )}
          <span className="truncate font-medium">{value || placeholder}</span>
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Dropdown via Portal — NOT clipped by parent overflow */}
      {mounted && isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            zIndex: 9999,
          }}
          className="rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Search Bar */}
          <div className="p-3 border-b border-border/30 bg-background/80 backdrop-blur-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search event type..."
                className="pl-10 pr-3 h-10 rounded-xl bg-background border-border/40 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsOpen(false);
                    setSearch("");
                  }
                  if (e.key === "Enter" && search.trim() && !hasResults) {
                    e.preventDefault();
                    handleAddCustom();
                  }
                }}
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {/* All Events */}
            {!search.trim() && (
              <button
                type="button"
                onClick={() => handleSelect("All Events")}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-3",
                  value === "All Events"
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "hover:bg-primary/5 border border-transparent"
                )}
              >
                <span className="flex items-center gap-2 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-primary" />
                  All Events (Same Rate)
                </span>
                {value === "All Events" && <Check className="w-4 h-4" />}
              </button>
            )}

            {/* No results */}
            {!hasResults && search.trim() && (
              <div className="p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  No event types match &quot;{search}&quot;
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-2"
                  onClick={handleAddCustom}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add &quot;{search}&quot; as custom
                </Button>
              </div>
            )}

            {/* Groups */}
            {Object.entries(filteredGroups).map(([group, types]) => {
              const meaningfulTypes = types.filter((t) => t !== "All Events");
              if (meaningfulTypes.length === 0) return null;

              return (
                <div key={group} className="mb-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60 px-3 py-2">
                    {group}
                  </p>
                  {meaningfulTypes.map((type) => {
                    const isSelected = value === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleSelect(type)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm",
                          isSelected
                            ? "bg-primary/15 text-primary font-bold"
                            : "hover:bg-primary/5"
                        )}
                      >
                        <span className="truncate">{type}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}