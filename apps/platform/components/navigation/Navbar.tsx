import Link from 'next/link';
import { NavLink } from './NavLink';
import { MobileMenu } from './MobileMenu';

const NAV_ITEMS = [
  { label: 'الرئيسية', href: '/' },
  { label: 'المدرسين', href: '/teachers' },
  { label: 'الكورسات', href: '/courses' },
  { label: 'عن المنصة', href: '/about' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-neutral-200 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Brand Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link 
              href="/" 
              className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 6 3 12 0v-5" />
                </svg>
              </div>
              <span className="text-xl font-bold text-neutral-900 tracking-tight">
                الأول
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:gap-x-8">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                className="inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 border-transparent transition-all"
                activeClassName="text-primary-600 border-primary-600"
                inactiveClassName="text-neutral-600 hover:text-primary-600 hover:border-neutral-300"
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Desktop Authentication Actions */}
          <div className="hidden md:flex md:items-center md:gap-x-4">
            <Link
              href="/login"
              className="text-sm font-medium text-neutral-700 hover:text-primary-600 px-3 py-2 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-md transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              إنشاء حساب
            </Link>
          </div>

          {/* Mobile Menu Component */}
          <MobileMenu navItems={NAV_ITEMS} />
          
        </div>
      </nav>
    </header>
  );
}
