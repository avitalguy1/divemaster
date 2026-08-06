'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CatalogSection {
  id: number;
  code: string;
  title: string;
  items: {
    id: number;
    code: string;
    title: string;
    requiredCount: number;
  }[];
}

interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  padiNumber: string | null;
}

function NewRequestForm() {
  const t = useTranslations('Requests');
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedItemId = searchParams.get('itemId') || '';

  const [sections, setSections] = useState<CatalogSection[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItemId);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('');
  const [performedAt, setPerformedAt] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [studentNote, setStudentNote] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedItemId) {
      setSelectedItemId(preselectedItemId);
    }
  }, [preselectedItemId]);

  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, instRes, requestsRes] = await Promise.all([
          fetch('/api/catalog'),
          fetch('/api/instructors'),
          fetch('/api/requests?mine=true'),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setSections(catData.catalog || []);
        }

        if (instRes.ok) {
          const instData = await instRes.json();
          setInstructors(instData.instructors || []);
        }

        if (requestsRes.ok) {
          const reqData = await requestsRes.json();
          const firstReq = reqData.requests[0];
          if (firstReq?.request?.courseId) {
            const progRes = await fetch(`/api/courses/${firstReq.request.courseId}/progress`);
            if (progRes.ok) {
              const progData = await progRes.json();
              if (progData.mentor?.id) {
                setSelectedInstructorId(progData.mentor.id);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load catalog data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !selectedInstructorId || !performedAt) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: Number(selectedItemId),
          instructorId: selectedInstructorId,
          performedAt: new Date(performedAt).toISOString(),
          studentNote,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setErrorMsg(body.error?.message || 'Failed to submit request');
        setIsSubmitting(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setErrorMsg('Failed to submit request');
      setIsSubmitting(false);
    }
  };

  const selectedItemTitle = sections
    .flatMap((s) => s.items)
    .find((i) => String(i.id) === selectedItemId)?.title;

  const selectedInst = instructors.find((i) => i.id === selectedInstructorId);
  const selectedInstructorName = selectedInst
    ? `${selectedInst.firstName} ${selectedInst.lastName}`
    : undefined;

  return (
    <Card className="w-full max-w-xl border-slate-800 bg-slate-900 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">{t('newRequestTitle')}</CardTitle>
        <CardDescription className="text-slate-400 text-sm">
          {t('newRequestSubtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <Alert variant="destructive" className="mb-6 border-red-900/50 bg-red-950/50 text-red-200">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-slate-400">Loading requirement catalog...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Requirement Item Selector */}
            <div className="space-y-2">
              <Label htmlFor="item-select" className="text-slate-200 text-sm font-medium">
                {t('itemLabel')} *
              </Label>
              <Select value={selectedItemId} onValueChange={(val) => setSelectedItemId(val || '')}>
                <SelectTrigger id="item-select" className="bg-slate-950 border-slate-800 text-slate-100 h-11 w-full">
                  <SelectValue placeholder={t('itemPlaceholder')}>
                    {selectedItemTitle || undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 max-h-72">
                  {sections.map((sec) => (
                    <div key={sec.id} className="px-2 py-1">
                      <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider px-2 py-1 bg-slate-950/50 rounded">
                        {sec.title}
                      </div>
                      {sec.items.map((item) => (
                        <SelectItem
                          key={item.id}
                          value={String(item.id)}
                          className="focus:bg-slate-800 text-sm"
                        >
                          {item.title} {item.requiredCount > 1 ? `(X${item.requiredCount})` : ''}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Performed Input */}
            <div className="space-y-2">
              <Label htmlFor="date-input" className="text-slate-200 text-sm font-medium">
                {t('dateLabel')} *
              </Label>
              <Input
                id="date-input"
                type="date"
                value={performedAt}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setPerformedAt(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 h-11"
              />
            </div>

            {/* Target Instructor Picker */}
            <div className="space-y-2">
              <Label htmlFor="instructor-select" className="text-slate-200 text-sm font-medium">
                {t('instructorLabel')} *
              </Label>
              <Select value={selectedInstructorId} onValueChange={(val) => setSelectedInstructorId(val || '')}>
                <SelectTrigger id="instructor-select" className="bg-slate-950 border-slate-800 text-slate-100 h-11 w-full">
                  <SelectValue placeholder={t('instructorPlaceholder')}>
                    {selectedInstructorName || undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  {instructors.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id} className="focus:bg-slate-800 text-sm">
                      {inst.firstName} {inst.lastName} {inst.padiNumber ? `(${inst.padiNumber})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student Note */}
            <div className="space-y-2">
              <Label htmlFor="note-input" className="text-slate-200 text-sm font-medium">
                {t('noteLabel')}
              </Label>
              <Textarea
                id="note-input"
                placeholder={t('notePlaceholder')}
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 min-h-[100px]"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg"
            >
              {isSubmitting ? t('submitting') : t('submitButton')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function NewRequestPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 flex justify-center">
      <Suspense fallback={<div className="py-8 text-center text-slate-400">Loading form...</div>}>
        <NewRequestForm />
      </Suspense>
    </div>
  );
}
