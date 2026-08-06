'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ItemWithStatus {
  id: number;
  code: string;
  title: string;
  requiredCount: number;
  scoring: string;
  approvedCount: number;
  pendingCount: number;
  status: 'APPROVED' | 'PENDING' | 'NOT_STARTED';
}

interface SectionWithItems {
  id: number;
  code: string;
  title: string;
  items: ItemWithStatus[];
}

export default function RequirementsPage() {
  const [sections, setSections] = useState<SectionWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) return;

        const requestsRes = await fetch('/api/requests?mine=true');
        if (requestsRes.ok) {
          const reqData = await requestsRes.json();
          const firstReq = reqData.requests[0];
          if (firstReq?.request?.courseId) {
            const itemsRes = await fetch(`/api/courses/${firstReq.request.courseId}/items`);
            if (itemsRes.ok) {
              const itemsData = await itemsRes.json();
              setSections(itemsData.sections || []);
              setIsLoading(false);
              return;
            }
          }
        }

        // Fallback to static catalog if no requests yet
        const catRes = await fetch('/api/catalog');
        if (catRes.ok) {
          const catData = await catRes.json();
          const formatted = (catData.catalog || []).map((sec: any) => ({
            ...sec,
            items: sec.items.map((i: any) => ({
              ...i,
              approvedCount: 0,
              pendingCount: 0,
              status: 'NOT_STARTED',
            })),
          }));
          setSections(formatted);
        }
      } catch (err) {
        console.error('Failed to load requirements:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCatalog();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading catalog requirements...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Evaluation Requirements</h1>
          <p className="text-sm text-slate-400">
            Full PADI Divemaster Candidate Evaluation Catalog (53 Units)
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="border-slate-800 text-slate-300">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Accordion defaultValue={sections.map((s) => String(s.id))} className="space-y-4">
        {sections.map((sec) => {
          const secApproved = sec.items.reduce((acc, i) => acc + i.approvedCount, 0);
          const secTotal = sec.items.reduce((acc, i) => acc + i.requiredCount, 0);

          return (
            <AccordionItem
              key={sec.id}
              value={String(sec.id)}
              className="border border-slate-800 bg-slate-900 rounded-xl px-4 overflow-hidden"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full text-left pr-4 gap-2">
                  <span className="font-bold text-white text-base">{sec.title}</span>
                  <Badge variant="outline" className="self-start sm:self-center border-slate-700 text-slate-300 text-xs">
                    {secApproved} / {secTotal} Units Approved
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-2 space-y-3 border-t border-slate-800/60">
                {sec.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.requiredCount > 1 && (
                          <span className="text-xs text-slate-400 font-mono">
                            ({item.approvedCount} of {item.requiredCount} approved)
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono uppercase">
                        {item.code} • {item.scoring}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {item.status === 'APPROVED' ? (
                        <Badge className="bg-green-600/20 text-green-300 border border-green-500/30 text-xs">
                          APPROVED
                        </Badge>
                      ) : item.status === 'PENDING' ? (
                        <Badge className="bg-amber-600/20 text-amber-300 border border-amber-500/30 text-xs">
                          PENDING
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">
                          NOT STARTED
                        </Badge>
                      )}

                      {item.status !== 'APPROVED' && (
                        <Link href={`/dashboard/requests/new?itemId=${item.id}`}>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8">
                            Request
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
