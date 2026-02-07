"use client";

import { Calendar, Plus, List, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { id: 'today', label: 'Today', icon: Calendar, href: '/today' },
    { id: 'create', label: 'Create', icon: Plus, href: '/create' },
    { id: 'list', label: 'Clockworks', icon: List, href: '/list' },
    { id: 'profile', label: 'Profile', icon: User, href: '/profile' }
  ];

  return (
    <div className="bg-white/80 backdrop-blur-lg border-t border-gray-200 safe-area-bottom z-50 flex-shrink-0">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-3 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-500'
                }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-indigo-600' : ''}`} />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}