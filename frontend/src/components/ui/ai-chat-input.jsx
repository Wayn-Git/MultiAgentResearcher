import * as React from "react";
import { useState, useEffect, useRef, forwardRef } from "react";
import { Lightbulb, Globe, Paperclip, Send, ArrowUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const PLACEHOLDERS = [
    "What are the latest quantum computing breakthroughs?",
    "Research the impact of AI on healthcare",
    "Explain CRISPR gene editing applications",
    "Analyze climate change mitigation strategies",
    "Deep dive into neural network architectures",
    "Explore the future of renewable energy",
];

const AIChatInput = forwardRef(function AIChatInput(
    { onSubmit, disabled = false, value = "", onChange },
    ref
) {
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [showPlaceholder, setShowPlaceholder] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [deepSearchActive, setDeepSearchActive] = useState(false);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Expose focus via ref
    React.useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
    }));

    // Cycle placeholder text when input is inactive
    useEffect(() => {
        if (isActive || value) return;

        const interval = setInterval(() => {
            setShowPlaceholder(false);
            setTimeout(() => {
                setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
                setShowPlaceholder(true);
            }, 400);
        }, 3000);

        return () => clearInterval(interval);
    }, [isActive, value]);

    // Close input when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                if (!value) setIsActive(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value]);

    const handleActivate = () => setIsActive(true);

    const handleSubmit = () => {
        if (!value?.trim() || disabled) return;
        onSubmit?.(value.trim());
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const containerVariants = {
        collapsed: {
            height: 68,
            boxShadow: "0 2px 16px 0 rgba(0,0,0,0.3), 0 0 1px rgba(247,183,49,0.05)",
            transition: { type: "spring", stiffness: 120, damping: 18 },
        },
        expanded: {
            height: 128,
            boxShadow: "0 8px 40px 0 rgba(0,0,0,0.5), 0 0 1px rgba(247,183,49,0.08)",
            transition: { type: "spring", stiffness: 120, damping: 18 },
        },
    };

    const placeholderContainerVariants = {
        initial: {},
        animate: { transition: { staggerChildren: 0.025 } },
        exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
    };

    const letterVariants = {
        initial: { opacity: 0, filter: "blur(12px)", y: 10 },
        animate: {
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
            transition: {
                opacity: { duration: 0.25 },
                filter: { duration: 0.4 },
                y: { type: "spring", stiffness: 80, damping: 20 },
            },
        },
        exit: {
            opacity: 0,
            filter: "blur(12px)",
            y: -10,
            transition: {
                opacity: { duration: 0.2 },
                filter: { duration: 0.3 },
                y: { type: "spring", stiffness: 80, damping: 20 },
            },
        },
    };

    return (
        <motion.div
            ref={wrapperRef}
            className="ai-chat-input-container"
            variants={containerVariants}
            animate={isActive || value ? "expanded" : "collapsed"}
            initial="collapsed"
            onClick={handleActivate}
        >
            <div className="ai-chat-input-inner">
                {/* Input Row */}
                <div className="ai-input-row">
                    <button
                        className="ai-icon-btn"
                        title="Attach file"
                        type="button"
                        tabIndex={-1}
                    >
                        <Paperclip size={20} />
                    </button>

                    {/* Text Input & Placeholder */}
                    <div className="ai-input-field-wrap">
                        <input
                            ref={inputRef}
                            type="text"
                            value={value}
                            onChange={(e) => onChange?.(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="ai-text-input"
                            onFocus={handleActivate}
                            disabled={disabled}
                        />
                        <div className="ai-placeholder-overlay">
                            <AnimatePresence mode="wait">
                                {showPlaceholder && !isActive && !value && (
                                    <motion.span
                                        key={placeholderIndex}
                                        className="ai-placeholder-text"
                                        variants={placeholderContainerVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        {PLACEHOLDERS[placeholderIndex].split("").map((char, i) => (
                                            <motion.span
                                                key={i}
                                                variants={letterVariants}
                                                style={{ display: "inline-block" }}
                                            >
                                                {char === " " ? "\u00A0" : char}
                                            </motion.span>
                                        ))}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <motion.button
                        className="ai-send-btn"
                        title="Research"
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSubmit();
                        }}
                        disabled={disabled || !value?.trim()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {disabled ? (
                            <div className="ai-spinner" />
                        ) : (
                            <ArrowUp size={20} strokeWidth={2.5} />
                        )}
                    </motion.button>
                </div>

                {/* Expanded Controls */}
                <motion.div
                    className="ai-expanded-controls"
                    variants={{
                        hidden: {
                            opacity: 0,
                            y: 20,
                            pointerEvents: "none",
                            transition: { duration: 0.25 },
                        },
                        visible: {
                            opacity: 1,
                            y: 0,
                            pointerEvents: "auto",
                            transition: { duration: 0.35, delay: 0.08 },
                        },
                    }}
                    initial="hidden"
                    animate={isActive || value ? "visible" : "hidden"}
                >
                    <div className="ai-controls-row">
                        {/* Deep Research Toggle */}
                        <motion.button
                            className={`ai-toggle-btn ${deepSearchActive ? "active" : ""}`}
                            title="Deep Research"
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeepSearchActive((a) => !a);
                            }}
                            initial={false}
                            animate={{
                                width: deepSearchActive ? 155 : 42,
                                paddingLeft: deepSearchActive ? 10 : 11,
                            }}
                        >
                            <div className="ai-toggle-icon">
                                <Globe size={18} />
                            </div>
                            <motion.span
                                className="ai-toggle-label"
                                initial={false}
                                animate={{ opacity: deepSearchActive ? 1 : 0 }}
                            >
                                Deep Research
                            </motion.span>
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
});

export { AIChatInput };
