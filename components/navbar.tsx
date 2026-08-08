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
      } catch {
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
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  const homeHref =
    user?.role === 'INSTRUCTOR'
      ? '/instructor'
      : user?.role === 'ADMIN'
      ? '/admin'
      : '/dashboard';

  const isStudent = user?.role === 'STUDENT';
  const isHomeActive = pathname === '/dashboard' || pathname === '/instructor' || pathname === '/admin';
  const isRequestsActive = pathname.startsWith('/dashboard/requests');
  const isDmtsActive = pathname.includes('/candidates') || pathname.includes('/requests');
  const isInstructorsActive = pathname === '/instructors';
  const isReportsActive = pathname === '/reports' || pathname === '/dashboard/report';

  return (
    <>
      {/* Desktop Left Side Navigation Banner (Visible on Desktop >= 768px for Admin & Instructor) */}
      {user && !isStudent && (
        <aside className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-white z-50 shadow-2xl border-r border-slate-800 p-4 space-y-6">
          {/* Brand Header */}
          <Link href={homeHref} className="flex items-center gap-3 px-2 py-3 hover:opacity-90 transition-opacity border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center font-extrabold text-white shadow-md shadow-sky-500/20 text-lg">
              DM
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block leading-none">
                Underwater Vision
              </span>
              <span className="text-[10px] text-sky-400 font-semibold tracking-wider uppercase">
                PADI Evaluation Portal
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex-1 space-y-2 pt-2">
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 pb-1">
              Management Menu
            </div>

            <Link
              href={homeHref}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                isHomeActive
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-lg">🏠</span>
              <span>Home Dashboard</span>
            </Link>

            <Link
              href={user.role === 'ADMIN' ? '/admin' : '/instructor'}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                isDmtsActive
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-lg">🤿</span>
              <span>DMT Candidates</span>
            </Link>

            <Link
              href="/instructors"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                isInstructorsActive
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-lg">👨‍🏫</span>
              <span>Staff Instructors</span>
            </Link>

            <Link
              href="/reports"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                isReportsActive
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-lg">📊</span>
              <span>Reports & Analytics</span>
            </Link>
          </div>

          {/* User Profile & Logout at Bottom of Sidebar */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sky-400 border border-slate-700">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[10px] text-sky-400 font-medium truncate">
                  {user.role} {user.padiNumber ? `(${user.padiNumber})` : ''}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-9 font-bold"
            >
              {isLoggingOut ? 'Logging Off...' : 'Log Off'}
            </Button>
          </div>
        </aside>
      )}

      {/* Top Navbar Header (Visible on Mobile & Students; Hidden on Desktop when Admin/Instructor Sidebar is rendered) */}
      <header className={`bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs ${!isStudent && user ? 'md:hidden' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex justify-between items-center">
          {/* Brand Title & Home Link */}
          <Link href={homeHref} className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center font-extrabold text-white shadow-sm shadow-sky-500/20">
              DM
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight block leading-none">
                Underwater Vision
              </span>
              <span className="text-[11px] text-sky-600 font-semibold tracking-wider uppercase">
                Candidate Evaluation
              </span>
            </div>
          </Link>

          {/* User Profile & Log Off Action */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex flex-col items-end">
                <span className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                  {user.firstName} {user.lastName}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="outline"
                    className={
                      user.role === 'INSTRUCTOR'
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] py-0 px-2 font-medium'
                        : user.role === 'ADMIN'
                        ? 'border-purple-200 bg-purple-50 text-purple-700 text-[10px] py-0 px-2 font-medium'
                        : 'border-sky-200 bg-sky-50 text-sky-700 text-[10px] py-0 px-2 font-medium'
                    }
                  >
                    {user.role === 'STUDENT' ? 'DMT Candidate' : user.role} {user.padiNumber ? `(${user.padiNumber})` : ''}
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
                className="border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-xs h-8 font-medium shadow-2xs"
              >
                {isLoggingOut ? 'Logging Off...' : 'Log Off'}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Visible on Mobile Screens < 640px) */}
      {user && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg flex justify-around items-center h-14 px-2">
          {isStudent ? (
            <>
              {/* Student Link 1: Home */}
              <Link
                href="/dashboard"
                className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-bold ${
                  pathname === '/dashboard' ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="text-base leading-none">🏠</span>
                <span className="mt-0.5">Home</span>
              </Link>

              {/* Student Link 2: My Requests */}
              <Link
                href="/dashboard/requests"
                className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-bold ${
                  isRequestsActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="text-base leading-none">📋</span>
                <span className="mt-0.5">My Requests</span>
              </Link>

              {/* Student Link 3: My Report */}
              <Link
                href="/dashboard/report"
                className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-bold ${
                  isReportsActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="text-base leading-none">📄</span>
                <span className="mt-0.5">My Report</span>
              </Link>
            </>
          ) : (
            <>
              {/* Admin/Instructor Link 1: Home */}
              <Link
                href={homeHref}
                className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-bold ${
                  isHomeActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="text-base leading-none">🏠</span>
                <span className="mt-0.5">Home</span>
              </Link>

              {/* Admin/Instructor Link 2: DMTs */}
              <Link
                href={user.role === 'ADMIN' ? '/admin' : '/instructor'}
                className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-bold ${
                  isDmtsActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="text-base leading-none">🤿</span>
                <span className="mt-0.5">DMTs</span>
              </Link>

              {/* Admin/Instructor Link 3: Instructors */}
              <Link
                href="/instructors"
                className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-bold ${
                  isInstructorsActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="text-base leading-none">👨‍🏫</span>
                <span className="mt-0.5">Instructors</span>
              </Link>

              {/* Admin/Instructor Link 4: Report */}
              <Link
                href="/reports"
                className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-bold ${
                  isReportsActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="text-base leading-none">📊</span>
                <span className="mt-0.5">Report</span>
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );
}
