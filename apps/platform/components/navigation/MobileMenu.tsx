'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NavLink } from './NavLink';

interface NavItem {
  label: string;
  href: string;
}

interface MobileMenuProps {
  navItems: NavItem[];
}

export function MobileMenu({ navItems }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <div className="md:hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMenu}
        className="text-neutral-600 hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md p-2"
        aria-expanded={isOpen}
        aria-label="Toggle navigation menu"
        aria-controls="mobile-menu"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div 
          id="mobile-menu"
          className="absolute top-16 right-0 w-full bg-white border-b border-neutral-200 shadow-lg z-50"
        >
          <div className="px-4 pt-2 pb-6 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                className="block px-3 py-3 rounded-md text-base font-medium"
                activeClassName="bg-primary-50 text-primary-700 font-semibold"
                inactiveClassName="text-neutral-700 hover:bg-neutral-50 hover:text-primary-600"
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
            
            <div className="border-t border-neutral-100 mt-4 pt-4 flex flex-col space-y-3 px-3">
              <Link
                href={`${process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000'}/login`}
                onClick={closeMenu}
                className="block text-center px-4 py-2 text-base font-medium text-neutral-700 hover:text-primary-600 border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
              >
                تسجيل الدخول
              </Link>
              <Link
                href={`${process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000'}/register/student`}
                onClick={closeMenu}
                className="block text-center px-4 py-2 text-base font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors"
              >
                إنشاء حساب
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
