'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getFeatureFlag } from '@/lib/feature-flags';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/try', label: 'Practice', icon: '🎤' },
  { href: '/listen', label: 'Listen', icon: '👂' },
  { href: '/about', label: 'About', icon: 'ℹ️' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isEnabled = getFeatureFlag('ff.bottomNav');

  if (!isEnabled) return null;

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 safe-area-pb"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center p-2 rounded-lg min-h-[44px] min-w-[44px]
                transition-colors duration-200
                ${isActive 
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-lg mb-1" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-xs font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
