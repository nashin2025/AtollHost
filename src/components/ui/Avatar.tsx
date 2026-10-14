import { forwardRef, type HTMLAttributes, useMemo } from 'react';

const COLORS = [
  'var(--color-red-500)',
  'var(--color-orange-500)',
  'var(--color-yellow-500)',
  'var(--color-green-500)',
  'var(--color-teal-500)',
  'var(--color-blue-500)',
  'var(--color-indigo-500)',
  'var(--color-purple-500)',
  'var(--color-pink-500)',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: React.ReactNode;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className = '', name, src, size = 'md', fallback, style, ...props }, ref) => {
    const sizeStyles = {
      xs: { width: 24, height: 24, fontSize: 10 },
      sm: { width: 32, height: 32, fontSize: 12 },
      md: { width: 40, height: 40, fontSize: 14 },
      lg: { width: 48, height: 48, fontSize: 16 },
      xl: { width: 64, height: 64, fontSize: 20 },
    }[size];

    const initials = useMemo(() => getInitials(name), [name]);
    const bgColor = useMemo(() => getColorFromName(name), [name]);

    return (
      <div
        ref={ref}
        className={`avatar ${className}`.trim()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          backgroundColor: bgColor,
          color: 'white',
          fontWeight: 600,
          ...sizeStyles,
          ...style,
        }}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : fallback ? (
          fallback
        ) : (
          initials
        )}
      </div>
    );
  },
);

Avatar.displayName = 'Avatar';