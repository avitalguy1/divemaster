'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const loginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const body = await res.json();

      if (!res.ok) {
        setErrorMsg(body.error?.message || t('invalidCredentials'));
        setIsLoading(false);
        return;
      }

      // Redirect based on user role
      const role = body.user.role;
      const targetPath =
        role === 'ADMIN'
          ? '/admin'
          : role === 'INSTRUCTOR'
          ? '/instructor'
          : '/dashboard';

      window.location.href = targetPath;
    } catch {
      setErrorMsg(t('invalidCredentials'));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-slate-50 to-teal-50 px-4 py-8 text-slate-900">
      <Card className="w-full max-w-md border border-slate-200/90 bg-white/90 shadow-2xl backdrop-blur-md rounded-2xl">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white mb-2 shadow-md shadow-sky-500/20 font-extrabold text-xl">
            DM
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
            PADI Divemaster Evaluation
          </CardTitle>
          <CardDescription className="text-slate-500 text-sm font-medium">
            Sign in to your candidate, instructor, or admin account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errorMsg && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 text-sm">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 text-xs font-semibold">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@diveshop.com"
                {...register('email')}
                className="bg-white border-slate-300 text-slate-900 focus:ring-sky-500 h-11"
              />
              {errors.email && (
                <p className="text-xs text-red-600 font-medium mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-slate-700 text-xs font-semibold">
                  Password
                </Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className="bg-white border-slate-300 text-slate-900 focus:ring-sky-500 h-11"
              />
              {errors.password && (
                <p className="text-xs text-red-600 font-medium mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold h-11 mt-2 shadow-md shadow-sky-600/15"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center space-y-3 pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium">
            New DMT candidate?{' '}
            <Link href="/signup" className="text-sky-600 font-bold hover:underline">
              Sign up as DMT
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
