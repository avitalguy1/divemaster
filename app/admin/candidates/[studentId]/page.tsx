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

  const loadData = async () => {
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
      console.error('Failed to load candidate report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  const handleVoidRequest = async () => {
    if (!activeVoidReq) return;
    if (!voidReason.trim()) {
      setErrorMsg('A void reason is required by PADI audit standards.');
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
      await loadData();
    } catch {
      setErrorMsg('Void action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!candidate) return;
    if (!confirm(`Are you sure you want to permanently delete DMT candidate "${candidate.studentName}"?\n\nThis will remove all associated sign-off requests and course evaluation progress.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/candidates/${candidate.studentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        window.location.href = '/admin';
      } else {
        const body = await res.json();
        alert(body.error?.message || 'Failed to delete candidate');
      }
    } catch {
      alert('Failed to delete candidate');
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Loading candidate status report...</div>;
  }

  if (!candidate) {
    return (
      <div className="p-12 text-center text-slate-600 space-y-4">
        <p className="font-semibold text-lg">DMT Candidate status report not found.</p>
        <Link href="/admin">
          <Button variant="outline" className="border-slate-300 text-slate-700">
            Back to Candidates Roster
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-600 p-6 sm:p-8 rounded-2xl text-white shadow-lg shadow-sky-600/15">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 font-medium">
                &larr; Back to Roster
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold">{candidate.studentName}</h1>
          </div>
          <p className="text-sm text-sky-100 mt-1 font-medium">
            Status Report & Evaluation Audit Record • {candidate.email}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {candidate.status === 'COMPLETE' ? (
            <Badge className="bg-emerald-500 text-white font-bold px-3 py-1">
              COMPLETE
            </Badge>
          ) : (
            <Badge variant="outline" className="border-white/30 bg-white/15 text-white font-medium px-3 py-1">
              IN TRAINING
            </Badge>
          )}
          <a href={`/api/courses/${candidate.courseId}/pdf`} download>
            <Button size="sm" className="bg-white text-sky-800 hover:bg-sky-50 font-bold shadow-sm">
              Export Evaluation PDF
            </Button>
          </a>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDeleteCandidate}
            className="border-red-300 bg-red-500/20 text-white hover:bg-red-600 font-bold"
          >
            Delete Candidate
          </Button>
        </div>
      </div>

      {/* Progress KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium">Overall Completion</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-sky-700">{candidate.percentComplete}%</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Progress value={candidate.percentComplete} className="h-2 bg-slate-100" />
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium font-mono">Approved Units</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-emerald-600">{candidate.approvedUnits} / 53</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500">PADI Requirements Satisfied</span>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium font-mono">Pending Review</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-amber-600">{candidate.pendingCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500">Awaiting Instructor Sign-off</span>
          </CardContent>
        </Card>
      </div>

      {/* Section Progress Breakdown Table */}
      <Card className="border border-slate-200/80 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">Progress Breakdown by Catalog Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sections.map((sec) => {
            const secPercent = sec.totalUnits > 0 ? Math.round((sec.approvedUnits / sec.totalUnits) * 100) : 0;
            return (
              <div key={sec.sectionId} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 text-sm">{sec.title}</span>
                  <span className="text-slate-600 font-mono font-bold">
                    {sec.approvedUnits} / {sec.totalUnits} units ({secPercent}%)
                  </span>
                </div>
                <Progress value={secPercent} className="h-2 bg-slate-200" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Approved Sign-off Records Table (With Void Capability) */}
      <Card className="border border-slate-200/80 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">Approved Sign-off Records ({candidate.approvedRequests.length})</CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            Historical audit record of approved evaluations. Administrators may void invalid records with a mandatory reason.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidate.approvedRequests.length === 0 ? (
            <div className="py-8 text-center text-slate-500 italic">No approved sign-off records found for this candidate.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-700 font-bold">Requirement Title</TableHead>
                  <TableHead className="text-slate-700 font-bold">Approved Date</TableHead>
                  <TableHead className="text-slate-700 font-bold">Signed By (Snapshot)</TableHead>
                  <TableHead className="text-slate-700 font-bold">Score</TableHead>
                  <TableHead className="text-right text-slate-700 font-bold">Admin Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidate.approvedRequests.map((req) => (
                  <TableRow key={req.requestId} className="border-slate-200 hover:bg-sky-50/40 transition-colors">
                    <TableCell className="font-bold text-slate-800">
                      {req.title}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-slate-600">
                      {new Date(req.decidedAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-sky-700 font-medium">
                      {req.instructorNameSnapshot}
                    </TableCell>

                    <TableCell className="font-bold text-slate-700 font-mono">
                      {req.score ? `${req.score} / 5` : 'Pass'}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveVoidReq(req);
                          setErrorMsg(null);
                        }}
                        className="border-red-200 text-red-700 hover:bg-red-50 font-medium text-xs"
                      >
                        Void Record
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Void Dialog Modal */}
      <Dialog open={!!activeVoidReq} onOpenChange={(open) => !open && setActiveVoidReq(null)}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900">Void Approved Sign-off</DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              Voiding an approved sign-off row preserves the historical audit entry while reverting candidate requirement progress.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {errorMsg && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 text-sm">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="text-slate-700 text-xs font-semibold">Requirement Item</Label>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 font-bold text-slate-800 text-sm">
                {activeVoidReq?.title}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="void-reason" className="text-slate-700 text-sm font-semibold">
                Reason for Voiding (Mandatory) *
              </Label>
              <Textarea
                id="void-reason"
                placeholder="Enter detailed audit reason..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 min-h-[90px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActiveVoidReq(null)}
              className="border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || !voidReason.trim()}
              onClick={handleVoidRequest}
              className="bg-red-600 hover:bg-red-500 text-white font-bold shadow-xs"
            >
              {isSubmitting ? 'Voiding...' : 'Confirm Void Action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
