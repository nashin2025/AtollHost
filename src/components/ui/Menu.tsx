import { useState, useRef, useEffect, type ReactNode, type HTMLAttributes, type KeyboardEvent, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import React from 'react';

interface MenuProps {
  children: ReactNode;
}

export function Menu({ children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key === 'Tab') {
        trapFocus(event, contentRef.current);
      }
    };

    const onMouseDown = (event: globalThis.MouseEvent) => {
      onClickOutside(event);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);

    contentRef.current
      ?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      ?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open]);

  function onClickOutside(event: globalThis.MouseEvent) {
    if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
  }

  function trapFocus(event: globalThis.KeyboardEvent, root: HTMLElement | null) {
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <MenuContext.Provider value={{ open, setOpen, triggerRef }}>
        {children}
      </MenuContext.Provider>
      {open && createPortal(
        <div
          className="af-menu-overlay"
          onMouseDown={(e: React.MouseEvent) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            ref={contentRef}
            role="menu"
            className="af-menu"
            tabIndex={-1}
          >
            {React.Children.map(children, (child: React.ReactNode) => {
              if (!React.isValidElement(child)) return null;
              if (child.type === MenuTrigger) {
                return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, { ref: triggerRef });
              }
              return child;
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

const MenuContext = createContext<{ open: boolean; setOpen: (open: boolean) => void; triggerRef: React.RefObject<HTMLButtonElement> } | null>(null);

interface MenuTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children: ReactNode;
}

export function MenuTrigger({ asChild = false, children, ...props }: MenuTriggerProps) {
  const context = useContext(MenuContext);
  if (!context) throw new Error('MenuTrigger must be used within Menu');

  const { open, setOpen, triggerRef } = context;

  const handleClick = () => setOpen(!open);
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ...props,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      'aria-haspopup': 'menu',
      'aria-expanded': open,
      ref: triggerRef,
    });
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-haspopup="menu"
      aria-expanded={open}
      {...props}
    >
      {children}
    </button>
  );
}

interface MenuContentProps {
  children: ReactNode;
  className?: string;
}

export function MenuContent({ children, className = '' }: MenuContentProps) {
  const context = useContext(MenuContext);
  if (!context) throw new Error('MenuContent must be used within Menu');
  const { open } = context;

  const contentRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  return (
    <div ref={contentRef} className={`af-menu-content${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}

interface MenuItemProps extends HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
  destructive?: boolean;
}

export function MenuItem({ disabled, destructive, className = '', children, ...props }: MenuItemProps) {
  return (
    <button
      role="menuitem"
      type="button"
      className={`af-menu-item${disabled ? ' af-menu-item--disabled' : ''}${destructive ? ' af-menu-item--destructive' : ''}${className ? ` ${className}` : ''}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export function MenuSeparator({ className = '', ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr role="separator" className={`af-menu-separator${className ? ` ${className}` : ''}`} {...props} />;
}