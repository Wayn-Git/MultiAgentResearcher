"use client";

import { useEffect, useRef, useCallback } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    ImageIcon,
    FileUp,
    Figma,
    MonitorIcon,
    CircleUserRound,
    ArrowUpIcon,
    Paperclip,
    PlusIcon,
} from "lucide-react";

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback((reset?: boolean) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        if (reset) { textarea.style.height = `${minHeight}px`; return; }
        textarea.style.height = `${minHeight}px`;
        const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY));
        textarea.style.height = `${newHeight}px`;
    }, [minHeight, maxHeight]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) textarea.style.height = `${minHeight}px`;
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

export function VercelV0Chat({
    onSubmit,
    isHero = true,
}: {
    onSubmit?: (query: string) => void;
    isHero?: boolean;
}) {
    const [value, setValue] = useState("");
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 60, maxHeight: 200 });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                onSubmit?.(value);
                setValue("");
                adjustHeight(true);
            }
        }
    };

    const handleSubmit = () => {
        if (value.trim()) {
            onSubmit?.(value);
            setValue("");
            adjustHeight(true);
        }
    };

    return (
        <div className={cn(
            "flex flex-col items-center w-full mx-auto p-2 sm:p-4",
            isHero ? "max-w-4xl space-y-4 sm:space-y-8" : "max-w-[900px] space-y-0"
        )}>
            {isHero && (
                <h1 className="text-2xl sm:text-4xl font-bold text-white text-center tracking-tight px-2">
                    What can I help you ship?
                </h1>
            )}

            <div className="w-full px-2 sm:px-0">
                <div className="relative bg-neutral-900 rounded-xl border border-zinc-700"
                    style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 40px rgba(0,0,0,0.6)" }}
                >
                    <div className="overflow-y-auto">
                        <textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => { setValue(e.target.value); adjustHeight(); }}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask v0 a question..."
                            className={cn(
                                "w-full px-3 sm:px-4 py-3 resize-none bg-transparent",
                                "border-none outline-none",
                                "text-white text-sm",
                                "placeholder:text-neutral-500",
                                "min-h-[60px]"
                            )}
                            style={{ overflow: "hidden" }}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 sm:p-3">
                        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
                            <button type="button"
                                className="group p-2 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1 min-h-[40px]"
                            >
                                <Paperclip className="w-4 h-4 text-white" />
                                <span className="text-xs text-zinc-400 hidden sm:inline transition-opacity">Attach</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                            <button type="button"
                                className="px-2 py-1 rounded-lg text-sm text-zinc-400 transition-colors border border-dashed border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800 flex items-center gap-1 min-h-[40px] text-xs sm:text-sm"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Project</span>
                            </button>
                            <button type="button"
                                onClick={handleSubmit}
                                className={cn(
                                    "px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-sm transition-colors border border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800 flex items-center gap-1 min-h-[40px]",
                                    value.trim() ? "bg-white text-black border-white" : "text-zinc-400"
                                )}
                            >
                                <ArrowUpIcon className={cn("w-4 h-4", value.trim() ? "text-black" : "text-zinc-400")} />
                                <span className="sr-only">Send</span>
                            </button>
                        </div>
                    </div>
                </div>

                {isHero && (
                    <div className="flex items-center justify-center gap-2 sm:gap-3 mt-4 flex-wrap px-2">
                        <ActionButton icon={<ImageIcon className="w-4 h-4" />} label="Clone a Screenshot" />
                        <ActionButton icon={<Figma className="w-4 h-4" />} label="Import from Figma" />
                        <ActionButton icon={<FileUp className="w-4 h-4" />} label="Upload a Project" />
                        <ActionButton icon={<MonitorIcon className="w-4 h-4" />} label="Landing Page" />
                        <ActionButton icon={<CircleUserRound className="w-4 h-4" />} label="Sign Up Form" />
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <button type="button"
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-full border border-zinc-700 text-zinc-400 hover:text-white transition-colors text-xs"
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
