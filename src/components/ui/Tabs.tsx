import { createContext, useContext, useId, useRef, type ReactNode } from 'react';

interface TabContextValue {
  selectedIndex: number;
  onChange: (index: number) => void;
  tabsRef: React.MutableRefObject<HTMLButtonElement[]>;
  generatedId: string;
}

const TabContext = createContext<TabContextValue | null>(null);

function useTabContext(): TabContextValue {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('Tab components must be used within TabList');
  }
  return context;
}

interface TabListProps {
  children: ReactNode;
  onChange: (index: number) => void;
  selectedIndex: number;
  'aria-label'?: string;
}

export function TabList({ children, onChange, selectedIndex, 'aria-label': ariaLabel }: TabListProps) {
  const tabsRef = useRef<HTMLButtonElement[]>([]);
  const generatedId = useId();

  const value: TabContextValue = {
    selectedIndex,
    onChange,
    tabsRef,
    generatedId,
  };

  return (
    <TabContext.Provider value={value}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        {children}
      </div>
    </TabContext.Provider>
  );
}

interface TabProps {
  index: number;
  children: ReactNode;
  disabled?: boolean;
}

export function Tab({ index, children, disabled }: TabProps) {
  const { selectedIndex, onChange, tabsRef, generatedId } = useTabContext();
  const isSelected = selectedIndex === index;

  return (
    <button
      ref={(el) => { if (el) tabsRef.current[index] = el; }}
      role="tab"
      aria-selected={isSelected}
      aria-controls={`${generatedId}-panel-${index}`}
      id={`${generatedId}-tab-${index}`}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      onClick={() => { if (!disabled) onChange(index); }}
      onKeyDown={(event) => {
        if (disabled) return;
        const tabs = (tabsRef.current ?? []).filter((t): t is HTMLButtonElement => t !== null);
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const direction = event.key === 'ArrowRight' ? 1 : -1;
          const nextIndex = (index + direction + tabs.length) % tabs.length;
          tabs[nextIndex]?.focus();
        } else if (event.key === 'Home') {
          event.preventDefault();
          tabs[0]?.focus();
        } else if (event.key === 'End') {
          event.preventDefault();
          tabs[tabs.length - 1]?.focus();
        }
      }}
      style={{
        padding: 'var(--space-2) var(--space-4)',
        border: 'none',
        background: isSelected ? 'var(--color-primary)' : 'transparent',
        color: isSelected ? 'var(--color-primary-contrast)' : 'var(--color-text)',
        borderBottom: `2px solid ${isSelected ? 'var(--color-primary)' : 'transparent'}`,
        marginBottom: '-1px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: isSelected ? 600 : 400,
        transition: 'all 150ms ease',
      }}
    >
      {children}
    </button>
  );
}

interface TabPanelsProps {
  selectedIndex: number;
  children: ReactNode;
}

export function TabPanels({ selectedIndex, children }: TabPanelsProps) {
  const { generatedId } = useTabContext();

  return (
    <div role="tabpanel" aria-labelledby={`${generatedId}-tab-${selectedIndex}`}>
      {children}
    </div>
  );
}

interface TabPanelProps {
  index: number;
  children: ReactNode;
}

export function TabPanel({ index, children }: TabPanelProps) {
  const { selectedIndex, generatedId } = useTabContext();
  const isSelected = selectedIndex === index;

  if (!isSelected) return null;

  return (
    <div
      role="tabpanel"
      id={`${generatedId}-panel-${index}`}
      aria-labelledby={`${generatedId}-tab-${index}`}
      tabIndex={0}
      style={{ animation: 'fadeIn 150ms ease' }}
    >
      {children}
    </div>
  );
}