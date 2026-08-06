'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  padiNumber: string | null;
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const body = await res.json();
          setUser(body.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      }
    }

    if (pathname !== '/login') {
      loadUser();
    } else {
      setUser(null);
    }
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (pathname === '/login') {
    return null;
  }

  const homeHref =
    user?.role === 'INSTRUCTOR'
      ? '/instructor'
      : user?.role === 'ADMIN'
      ? '/admin'
      : '/dashboard';

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex justify-between items-center">
        {/* Brand Title & Home Link */}
        <Link href={homeHref} className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            DM
          </div>
          <div>
            <span className="font-bold text-white text-base sm:text-lg tracking-tight block leading-none">
              PADI Divemaster
            </span>
            <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
              Candidate Progress
            </span>
          </div>
        </Link>

        {/* User Profile & Log Off Action */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-white leading-snug">
                {user.firstName} {user.lastName}
              </span>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={
                    user.role === 'INSTRUCTOR'
                      ? 'border-blue-500/50 bg-blue-950/40 text-blue-300 text-[10px] py-0 px-1.5'
                      : user.role === 'ADMIN'
                      ? 'border-purple-500/50 bg-purple-950/40 text-purple-300 text-[10px] py-0 px-1.5'
                      : 'border-green-500/50 bg-green-950/40 text-green-300 text-[10px] py-0 px-1.5'
                  }
                >
                  {user.role === 'STUDENT' ? 'DMT' : user.role} {user.padiNumber ? `(${user.padiNumber})` : ''}
                </Badge>
              </div>
            </div>
          )}

          {user && (
            <Button
              size="sm"
              variant="outline"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-9"
            >
              {isLoggingOut ? 'Logging Off...' : 'Log Off'}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
