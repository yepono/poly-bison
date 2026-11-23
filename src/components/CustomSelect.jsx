import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function CustomSelect({ label, options, value, onChange, placeholder = "Selecciona una opción" }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <div className="flex flex-col gap-1.5 relative w-full" ref={selectRef}>
            {label && (
                <label className="text-sm font-semibold text-ink-soft">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2.5 flex items-center justify-between border border-line rounded-lg bg-field text-ink focus:outline-none focus:ring-2 focus:ring-accent transition-all"
            >
                <span className={selectedOption ? "text-ink" : "text-ink-muted"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>


                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-accent text-xs ml-2"
                >
                    ▼
                </motion.span>
            </button>

            
            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 top-[calc(100%+6px)] left-0 w-full max-h-48 overflow-y-auto bg-surface border border-line rounded-lg shadow-pop custom-scrollbar"
                    >
                        {options.map((option) => (
                            <li
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`px-4 py-2 text-sm cursor-pointer transition-colors hover:bg-brand/40 hover:text-accent ${
                                    value === option.value
                                        ? "bg-brand/30 text-accent font-semibold"
                                        : "text-ink-soft"
                                }`}
                            >
                                {option.label}
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}

export default CustomSelect;