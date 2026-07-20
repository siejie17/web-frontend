import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

function CustomDropdown<T extends Record<string, any>>({
  data,
  value,
  onChange,
  labelField,
  valueField,
  placeholder,
  renderItem,
  renderSelectedLabel,
  disable = false,
  maxHeight = 280,
  className = '',
  containerClassName = '',
}: {
  data: T[];
  value: T | null | undefined;
  onChange: (item: T) => void;
  labelField: string;
  valueField: string;
  placeholder: string;
  renderItem: (item: T) => ReactNode;
  renderSelectedLabel: (item: T) => ReactNode;
  disable?: boolean;
  maxHeight?: number;
  className?: string;
  containerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; openUpward: boolean } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Compute (and keep updated) the menu's position relative to the trigger.
  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const openUpward = spaceBelow < Math.min(maxHeight, 320) && rect.top > spaceBelow;

    setPosition({
      top: openUpward ? rect.top : rect.bottom,
      left: rect.left,
      width: rect.width,
      openUpward,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the menu glued to the trigger while open (scroll of any ancestor, resize, etc.)
  useEffect(() => {
    if (!open) return;
    const handle = () => updatePosition();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Click-outside now needs to check both the trigger AND the portaled menu.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape for accessibility.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disable}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={[
          'flex w-full items-center justify-between gap-2 rounded-[14px] border px-3.5 text-left transition-all duration-150 ease-out',
          disable
            ? 'cursor-not-allowed border-[#1C1F1D]/[0.06] bg-[#1C1F1D]/[0.025]'
            : 'border-[#1C1F1D]/[0.1] bg-white hover:border-[#3E6B52]/35',
          open ? 'border-[#3E6B52]/50 ring-2 ring-[#3E6B52]/[0.12]' : '',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]/40',
          className,
        ].join(' ')}
        style={{ height: 48 }}
      >
        {value ? renderSelectedLabel(value) : <span className="text-sm text-[#1C1F1D]/35">{placeholder}</span>}
        {open ? (
          <ChevronUp size={14} className={disable ? 'text-[#1C1F1D]/20' : 'text-[#1C1F1D]/40'} />
        ) : (
          <ChevronDown size={14} className={disable ? 'text-[#1C1F1D]/20' : 'text-[#1C1F1D]/40'} />
        )}
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && !disable && position && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: position.openUpward ? 6 : -6, scale: 0.98 }}
                animate={{ opacity: 1, y: position.openUpward ? -4 : 4, scale: 1 }}
                exit={{ opacity: 0, y: position.openUpward ? 6 : -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                role="listbox"
                className={[
                  'fixed overflow-y-auto rounded-[16px] border border-[#1C1F1D]/[0.08] bg-white shadow-[0_4px_12px_rgba(28,31,29,0.06),0_16px_40px_-12px_rgba(28,31,29,0.18)]',
                  containerClassName,
                ].join(' ')}
                style={{
                  top: position.openUpward ? undefined : position.top,
                  bottom: position.openUpward ? window.innerHeight - position.top : undefined,
                  left: position.left,
                  width: position.width,
                  maxHeight,
                  zIndex: 9999,
                }}
              >
                {data.map((d, i) => (
                  <div
                    key={String(d[valueField]) + i}
                    role="option"
                    aria-selected={value ? value[valueField] === d[valueField] : false}
                    onClick={() => {
                      onChange(d);
                      setOpen(false);
                    }}
                    className="cursor-pointer border-b border-[#1C1F1D]/[0.04] transition-colors duration-100 last:border-b-0 hover:bg-[#3E6B52]/[0.05]"
                  >
                    {renderItem(d)}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

export default CustomDropdown;
