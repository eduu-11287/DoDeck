import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export default function DropdownSelect({ id, value, options, onChange, label, className = '', ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const generatedId = useId();
  const selectId = id || `dropdown-${generatedId}`;
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return undefined;

    const updatePosition = () => {
      const bounds = triggerRef.current.getBoundingClientRect();
      const maxHeight = Math.min(280, window.innerHeight - 24);
      const menuHeight = Math.min(Math.max(options.length * 42 + 10, 50), maxHeight);
      const width = Math.min(Math.max(bounds.width, 180), window.innerWidth - 24);
      const left = Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12));
      const spaceBelow = window.innerHeight - bounds.bottom - 12;
      const top = spaceBelow >= menuHeight || spaceBelow >= bounds.top - 12
        ? Math.min(bounds.bottom + 6, window.innerHeight - menuHeight - 12)
        : Math.max(12, bounds.top - menuHeight - 6);
      setPosition({ top, left, width, maxHeight });
    };
    const closeOnOutsidePointer = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const closeOnScroll = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };

    updatePosition();
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, options.length]);

  useEffect(() => {
    if (!isOpen || !position) return;
    const selected = menuRef.current?.querySelector('[aria-selected="true"]');
    (selected || menuRef.current?.querySelector('[role="option"]'))?.focus();
  }, [isOpen, position]);

  const moveFocus = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const optionButtons = [...(menuRef.current?.querySelectorAll('[role="option"]') || [])];
    const currentIndex = optionButtons.indexOf(document.activeElement);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? optionButtons.length - 1
        : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + optionButtons.length) % optionButtons.length;
    optionButtons[nextIndex]?.focus();
  };

  return (
    <div className="dropdown-select-field">
      <button
        ref={triggerRef}
        id={selectId}
        className={`dropdown-trigger ${className}`}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${selectId}-options`}
        aria-labelledby={label ? undefined : `${selectId}-label`}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <span className="dropdown-value">{selectedOption?.label}</span>
        <ChevronDown className="dropdown-chevron" size={15} aria-hidden="true" />
      </button>
      {!label && !ariaLabel && <span id={`${selectId}-label`} className="sr-only">Choose an option</span>}
      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          id={`${selectId}-options`}
          className="dropdown-menu filter-menu"
          role="listbox"
          aria-label={label || ariaLabel || 'Options'}
          style={position}
          onKeyDown={moveFocus}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              className={`filter-option${option.value === value ? ' selected' : ''}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
