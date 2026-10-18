export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeStyles = {
  xs: { width: 24, height: 24, fontSize: 10 },
  sm: { width: 32, height: 32, fontSize: 11 },
  md: { width: 40, height: 40, fontSize: 14 },
  lg: { width: 48, height: 48, fontSize: 16 },
  xl: { width: 64, height: 64, fontSize: 20 },
};

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 8;
  const colors = [
    'var(--color-brand)',
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-danger)',
    'var(--color-info)',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
  ];
  const bgColor = colors[colorIndex];

  const style = sizeStyles[size];

  return (
    <div
      className={`af-avatar${className ? ` ${className}` : ''}`}
      style={{
        width: style.width,
        height: style.height,
        fontSize: style.fontSize,
        backgroundColor: src ? undefined : bgColor,
      }}
      aria-label={name}
    >
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      ) : (
        initials
      )}
    </div>
  );
}