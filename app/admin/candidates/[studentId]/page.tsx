'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ApprovedRecord {
  requestId: string;
  itemId: number;
  title: string;
  decidedAt: string;
  instructorNameSnapshot: string;
  attemptNumber: number;
  score: number | null;
}

interface CandidateOverview {
  studentId: string;
  studentName: string;
  email: string;
  courseId: string;
  approvedUnits: number;
  percentComplete: number;
  status: string;
  pendingCount: number;
  approvedRequests: ApprovedRecord[];
}

interface SectionProgress {
  sectionId: number;
  code: string;
  title: string;
  totalUnits: number;
  approvedUnits: number;
  pendingUnits: number;
}

export default function AdminCandidateReportPage({ params }: { params: Promise<{ studentId: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.studentId;

  const [candidate, setCandidate] = useState<CandidateOverview | null>(null);
  const [sections, setSections] = useState<SectionProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Void modal state
  const [activeVoidReq, setActiveVoidReq] = useState<ApprovedRecord | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/instructors/candidates');
      if (res.ok) {
        const body = await res.json();
        const cand = (body.candidates || []).find((c: CandidateOverview) => c.studentId === studentId);
        setCandidate(cand || null);

        if (cand?.courseId) {
          const progRes = await fetch(`/api/courses/${cand.courseId}/progress`);
          if (progRes.ok) {
            const progData = await progRes.json();
            setSections(progData.progress?.sections || []);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load candidate status report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [studentId]);

  const handleVoid = async () => {
    if (!activeVoidReq) return;
    if (!voidReason.trim()) {
      setErrorMsg('Void reason is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/requests/${activeVoidReq.requestId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      });

      const body = await res.json();
      if (!res.ok) {
        setErrorMsg(body.error?.message || 'Void action failed');
        setIsSubmitting(false);
        return;
      }

      setActiveVoidReq(null);
      setVoidReason('');
      loadReportData();
    } catch {
      setErrorMsg('Void action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading DMT status report...</div>;
  }

  if (!candidate) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-4">
        <p>DMT Candidate status report not found.</p>
        <Link href="/admin">
          <Button variant="outline" className="border-slate-800 text-slate-300">
            Back to Candidates Roster
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button size="sm" variant="outline" className="border-slate-800 text-slate-400 hover:text-white">
                &larr; Back to Roster
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white">{candidate.studentName}</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Status Report & Evaluation Audit Record • {candidate.email}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {candidate.status === 'COMPLETE' ? (
            <Badge className="bg-green-600/20 text-green-300 border border-green-500/30">
              COMPLETE
            </Badge>
          ) : (
            <Badge variant="outline" className="border-blue-500/40 text-blue-300">
              IN TRAINING
            </Badge>
          )}
          <a href={`/api/courses/${candidate.courseId}/pdf`} download>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
              Export Evaluation PDF
            </Button>
          </a>
        </div>
      </div>

      {/* Progress KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400">Overall Completion</CardDescription>
            <CardTitle className="text-2xl font-bold text-white">{candidate.percentComplete}%</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Progress value={candidate.percentComplete} className="h-1.5 bg-slate-800" />
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400">Approved Units</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-400">{candidate.approvedUnits} / 53</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-400">PADI Requirements Met</span>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 col-span-2 sm:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400">Pending Review</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-400">{candidate.pendingCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-400">Awaiting Instructor Review</span>
          </CardContent>
        </Card>
      </div>

      {/* Section Progress Breakdown */}
      {sections.length > 0 && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-white">Section Progress Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sections.map((sec) => {
              const secPercent = sec.totalUnits > 0 ? Math.round((sec.approvedUnits / sec.totalUnits) * 100) : 0;
              return (
                <div key={sec.sectionId} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-200">{sec.title}</span>
                    <span className="text-slate-400 font-mono">
                      {sec.approvedUnits} / {sec.totalUnits} units ({secPercent}%)
                    </span>
                  </div>
                  <Progress value={secPercent} className="h-1.5 bg-slate-950" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Completed & Approved Tasks Table / List View */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white">Completed & Approved Tasks</CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Full record of all signed-off requirements for this DMT candidate ({candidate.approvedRequests.length} items)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidate.approvedRequests.length === 0 ? (
            <div className="py-8 text-center text-slate-400 italic">
              No completed or approved tasks for this candidate yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-300">Requirement Task</TableHead>
                  <TableHead className="text-slate-300">Date Approved</TableHead>
                  <TableHead className="text-slate-300">Approved By Instructor</TableHead>
                  <TableHead className="text-slate-300">Score</TableHead>
                  <TableHead className="text-right text-slate-300">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidate.approvedRequests.map((req) => (
                  <TableRow key={req.requestId} className="border-slate-800 hover:bg-slate-950/50">
                    <TableCell className="font-semibold text-slate-100">
                      <div>{req.title}</div>
                      <div className="text-xs text-slate-500 font-normal">Attempt {req.attemptNumber}</div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-300 font-mono">
                      {new Date(req.decidedAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-blue-400">
                      {req.instructorNameSnapshot}
                    </TableCell>

                    <TableCell className="text-xs text-slate-300 font-mono">
                      {req.score ? `${req.score} / 5` : 'Pass'}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setActiveVoidReq(req);
                          setErrorMsg(null);
                        }}
                        className="bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800/50 text-xs"
                      >
                        Void
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Admin Void Dialog */}
      {activeVoidReq && (
        <Dialog open={!!activeVoidReq} onOpenChange={(open) => !open && setActiveVoidReq(null)}>
          <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-purple-400">Void Approved Sign-off</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Student: {candidate.studentName} — Item: {activeVoidReq.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {errorMsg && (
                <Alert variant="destructive" className="border-red-900/50 bg-red-950/50 text-red-200 text-sm">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="void-reason" className="text-slate-200 text-sm font-medium">
                  Administrative Void Reason *
                </Label>
                <Textarea
                  id="void-reason"
                  placeholder="Provide an audit reason for voiding this sign-off..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 min-h-[100px]"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveVoidReq(null)} className="border-slate-800 text-slate-300">
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={isSubmitting || !voidReason.trim()}
                onClick={handleVoid}
                className="bg-purple-700 hover:bg-purple-600 text-white font-semibold"
              >
                {isSubmitting ? 'Voiding...' : 'Confirm Void'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
