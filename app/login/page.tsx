'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const loginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const t = useTranslations('Auth');
  const router = useRouter();
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
      if (role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'INSTRUCTOR') {
        router.push('/instructor');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch {
      setErrorMsg(t('invalidCredentials'));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-sm">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 mb-2 border border-blue-500/30">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            {t('loginTitle')}
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            {t('loginSubtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errorMsg && (
              <Alert variant="destructive" className="border-red-900/50 bg-red-950/50 text-red-200">
                <AlertTitle>{t('errorTitle')}</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200 text-sm font-medium">
                {t('emailLabel')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                autoComplete="email"
                className="bg-slate-950/60 border-slate-800 focus:border-blue-500 focus:ring-blue-500/20 text-slate-100 h-11"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-400 font-medium mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200 text-sm font-medium">
                {t('passwordLabel')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                autoComplete="current-password"
                className="bg-slate-950/60 border-slate-800 focus:border-blue-500 focus:ring-blue-500/20 text-slate-100 h-11"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-400 font-medium mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all duration-200 mt-2"
            >
              {isLoading ? t('signingIn') : t('signInButton')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 justify-center border-t border-slate-800/80 pt-4 text-xs text-slate-400">
          <div>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-blue-400 font-semibold hover:underline">
              Sign up as DMT
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
