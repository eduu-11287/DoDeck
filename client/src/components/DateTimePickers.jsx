import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Minus, Plus } from 'lucide-react';

const toDateKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

function fromDateKey(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function usePopoverPosition(isOpen, setIsOpen, triggerRef, panelRef, width, height) {
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return undefined;

    const updatePosition = () => {
      const bounds = triggerRef.current.getBoundingClientRect();
      const panelWidth = Math.min(width, window.innerWidth - 24);
      if (window.innerWidth <= 760) {
        setPosition({
          mobile: true,
          style: {
            top: '50%',
            left: '50%',
            width: panelWidth,
            maxHeight: window.innerHeight - 32,
            transform: 'translate(-50%, -50%)',
          },
        });
        return;
      }
      const spaceBelow = Math.max(0, window.innerHeight - bounds.bottom - 12);
      const spaceAbove = Math.max(0, bounds.top - 12);
      const openBelow = spaceBelow >= 260 || spaceBelow >= spaceAbove;
      const availableHeight = openBelow ? spaceBelow : spaceAbove;
      const panelHeight = Math.min(height, Math.max(180, availableHeight));
      const left = Math.max(12, Math.min(bounds.left, window.innerWidth - panelWidth - 12));
      const top = openBelow
        ? Math.min(bounds.bottom + 6, window.innerHeight - panelHeight - 12)
        : Math.max(12, bounds.top - panelHeight - 6);
      setPosition({ mobile: false, style: { top, left, width: panelWidth, maxHeight: panelHeight } });
    };
    const closeOnOutsidePointer = (event) => {
      if (!triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
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
      if (!panelRef.current?.contains(event.target)) setIsOpen(false);
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
  }, [height, isOpen, panelRef, setIsOpen, triggerRef, width]);

  return position;
}

export function DatePicker({ label, value, onChange, id }) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = fromDateKey(value) || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const selectedDate = fromDateKey(value);
  const generatedId = useId();
  const selectedKey = value || '';
  const datePickerId = id || `date-picker-${generatedId}`;
  const position = usePopoverPosition(isOpen, setIsOpen, triggerRef, panelRef, 320, 390);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((firstDay + dayCount) / 7) * 7;
  const calendarDays = useMemo(
    () => Array.from({ length: cellCount }, (_, index) => new Date(year, month, index - firstDay + 1, 12)),
    [cellCount, firstDay, month, year],
  );
  const todayKey = toDateKey(new Date());

  const chooseDate = (date) => {
    onChange(toDateKey(date));
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const shiftMonth = (delta) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <div className="date-time-field">
      <label className="form-label" htmlFor={datePickerId}>{label}</label>
      <button
        ref={triggerRef}
        id={datePickerId}
        className="date-time-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${datePickerId}-calendar`}
        onClick={() => {
          if (selectedDate) setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
          setIsOpen((open) => !open);
        }}
      >
        <CalendarDays size={16} aria-hidden="true" />
        <span>{selectedDate ? selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Choose a date'}</span>
        <ChevronDown className="date-time-chevron" size={15} aria-hidden="true" />
      </button>
      {isOpen && position && createPortal(
        <div
          className={`date-time-picker-backdrop${position.mobile ? ' mobile' : ''}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            ref={panelRef}
            id={`${datePickerId}-calendar`}
            className="date-picker-popover"
            style={position.style}
            role="dialog"
            aria-label={`Choose ${label.toLowerCase()}`}
          >
          <div className="date-picker-heading">
            <strong>{visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
            <div className="date-picker-month-controls">
              <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button>
              <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={17} /></button>
            </div>
          </div>
          <div className="date-picker-weekdays" aria-hidden="true">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
          </div>
          <div className="date-picker-days">
            {calendarDays.map((date) => {
              const dayKey = toDateKey(date);
              const isCurrentMonth = date.getMonth() === month;
              return (
                <button
                  key={dayKey}
                  type="button"
                  className={`date-picker-day${isCurrentMonth ? '' : ' outside-month'}${dayKey === selectedKey ? ' selected' : ''}${dayKey === todayKey ? ' today' : ''}`}
                  aria-label={date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  aria-pressed={dayKey === selectedKey}
                  onClick={() => chooseDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="date-picker-footer">
            <button type="button" className="date-picker-clear" onClick={() => { onChange(''); setIsOpen(false); }}>Clear date</button>
            <button type="button" className="date-picker-today" onClick={() => chooseDate(new Date())}>Today</button>
          </div>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}

function timeParts(value) {
  if (!value) return { hour: 9, minute: 0, period: 'AM' };
  const [hourString, minuteString] = value.split(':');
  const twentyFourHour = Number(hourString);
  return {
    hour: twentyFourHour % 12 || 12,
    minute: Number(minuteString),
    period: twentyFourHour >= 12 ? 'PM' : 'AM',
  };
}

function toTimeValue(hour, minute, period) {
  const twentyFourHour = (hour % 12) + (period === 'PM' ? 12 : 0);
  return `${String(twentyFourHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function TimePicker({ label, value, onChange, id }) {
  const [isOpen, setIsOpen] = useState(false);
  const [parts, setParts] = useState(() => timeParts(value));
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const generatedId = useId();
  const timePickerId = id || `time-picker-${generatedId}`;
  const position = usePopoverPosition(isOpen, setIsOpen, triggerRef, panelRef, 300, 245);

  const updateParts = (nextParts) => {
    setParts(nextParts);
    onChange(toTimeValue(nextParts.hour, nextParts.minute, nextParts.period));
  };
  const adjust = (key, delta) => {
    const current = timeParts(value || toTimeValue(parts.hour, parts.minute, parts.period));
    const nextValue = key === 'hour'
      ? ((current.hour - 1 + delta + 12) % 12) + 1
      : (current.minute + delta + 60) % 60;
    updateParts({ ...current, [key]: nextValue });
  };
  const displayedParts = timeParts(value || toTimeValue(parts.hour, parts.minute, parts.period));

  return (
    <div className="date-time-field">
      <label className="form-label" htmlFor={timePickerId}>{label}</label>
      <button
        ref={triggerRef}
        id={timePickerId}
        className="date-time-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${timePickerId}-picker`}
        onClick={() => {
          setParts(timeParts(value));
          setIsOpen((open) => !open);
        }}
      >
        <Clock3 size={16} aria-hidden="true" />
        <span>{value ? new Date(2000, 0, 1, ...value.split(':').map(Number)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Choose a time'}</span>
        <ChevronDown className="date-time-chevron" size={15} aria-hidden="true" />
      </button>
      {isOpen && position && createPortal(
        <div
          className={`date-time-picker-backdrop${position.mobile ? ' mobile' : ''}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            ref={panelRef}
            id={`${timePickerId}-picker`}
            className="time-picker-popover"
            style={position.style}
            role="dialog"
            aria-label={`Choose ${label.toLowerCase()}`}
          >
          <strong className="time-picker-title">Choose a time</strong>
          <div className="time-picker-controls">
            <div className="time-stepper">
              <span>Hour</span>
              <button type="button" onClick={() => adjust('hour', 1)} aria-label="Increase hour"><Plus size={15} /></button>
              <strong aria-live="polite">{String(displayedParts.hour).padStart(2, '0')}</strong>
              <button type="button" onClick={() => adjust('hour', -1)} aria-label="Decrease hour"><Minus size={15} /></button>
            </div>
            <span className="time-separator">:</span>
            <div className="time-stepper">
              <span>Minute</span>
              <button type="button" onClick={() => adjust('minute', 1)} aria-label="Increase minute"><Plus size={15} /></button>
              <strong aria-live="polite">{String(displayedParts.minute).padStart(2, '0')}</strong>
              <button type="button" onClick={() => adjust('minute', -1)} aria-label="Decrease minute"><Minus size={15} /></button>
            </div>
            <div className="time-period">
              {['AM', 'PM'].map((period) => (
                <button
                  key={period}
                  type="button"
                  className={displayedParts.period === period ? 'selected' : ''}
                  aria-pressed={displayedParts.period === period}
                  onClick={() => updateParts({ ...displayedParts, period })}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="time-picker-footer">
            <button type="button" className="date-picker-clear" onClick={() => { onChange(''); setIsOpen(false); }}>Clear time</button>
            <button type="button" className="date-picker-today" onClick={() => { onChange(toTimeValue(displayedParts.hour, displayedParts.minute, displayedParts.period)); setIsOpen(false); triggerRef.current?.focus(); }}>Done</button>
          </div>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}
