'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  onClick?: () => void;
}

export function NavLink({
  href,
  children,
  className = '',
  activeClassName = 'text-primary-600 font-semibold',
  inactiveClassName = 'text-neutral-600 hover:text-primary-600',
  onClick,
}: NavLinkProps) {
  const pathname = usePathname();
  
  // Logic to determine if active
  const isActive = 
    href === '/' 
      ? pathname === '/' 
      : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`${className} transition-colors duration-200 ${
        isActive ? activeClassName : inactiveClassName
      }`}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
