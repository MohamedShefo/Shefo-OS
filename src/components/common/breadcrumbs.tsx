'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';

/**
 * Contextual breadcrumb trail for the ERP-like shell.
 * First segment resolves through the centralized navigation registry;
 * deeper segments (e.g. entity detail ids) render as a neutral label.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Array<{ label: string; href: string | null }> = [];
  let acc = '';
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    if (i === 0) {
      const nav = NAV_ITEMS.find((n) => n.href === acc);
      crumbs.push({ label: nav ? nav.label : seg, href: i === segments.length - 1 ? null : acc });
    } else {
      crumbs.push({ label: 'Details', href: null });
    }
  });

  return (
    <nav aria-label="Breadcrumb" className="px-1">
      <ol className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <li>
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
        </li>
        {crumbs.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="text-muted-foreground/60">
              /
            </span>
            {c.href ? (
              <Link href={c.href} className="hover:text-foreground transition-colors">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground font-medium">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
