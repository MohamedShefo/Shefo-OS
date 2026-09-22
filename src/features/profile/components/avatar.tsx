import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-20 w-20 text-2xl',
} as const;

export function initialsOf(name?: string | null, email?: string | null): string {
  const source = (name ?? '').trim() || (email ?? '').trim();
  if (!source) return 'S';
  const parts = source.replace(/^@/, '').split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Avatar image with initials fallback (no external image service). */
export function Avatar({ src, name, email, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      // User-uploaded remote avatar (Supabase Storage); next/image remote
      // optimization is intentionally not configured for these URLs.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || email || 'Profile'}
        className={cn('rounded-full object-cover bg-muted', SIZES[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shrink-0',
        SIZES[size],
        className
      )}
    >
      {initialsOf(name, email)}
    </span>
  );
}
