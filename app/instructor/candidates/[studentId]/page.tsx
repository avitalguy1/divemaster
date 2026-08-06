'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SignaturePad } from '@/components/signature-pad';
import { ProgressPie } from '@/components/charts/progress-pie';

interface PendingReq {
  requestId: string;
  itemId: number;
  title: string;
  scoring: string;
  requiredCount: number;
  performedAt: string;
  studentNote: string | null;
  attemptNumber: number;
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
  pendingRequests: PendingReq[];
}

interface ProgressData {
  totalUnits: number;
  approvedUnits: number;
  pendingUnits: number;
  notStartedUnits: number;
  percentComplete: number;
  isComplete: boolean;
  sections: {
    sectionId: number;
    code: string;
    title: string;
    totalUnits: number;
    approvedUnits: number;
    pendingUnits: number;
  }[];
}

export default function CandidateDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.studentId;

  const [candidate, setCandidate] = useState<CandidateOverview | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active evaluating request
  const [activeReq, setActiveReq] = useState<PendingReq | null>(null);

  // Signature & adoption state
  const [signatureData, setSignatureData] = useState<string>('');
  const [savedAdoptedSignature, setSavedAdoptedSignature] = useState<string | null>(null);
  const [useAdoptedSignature, setUseAdoptedSignature] = useState<boolean>(false);
  const [adoptSignatureCheckbox, setAdoptSignatureCheckbox] = useState<boolean>(true);

  // Score & Comment state
  const [scoreInput, setScoreInput] = useState<number>(4);
  const [commentInput, setCommentInput] = useState<string>('');

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
            setProgress(progData.progress || null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load candidate details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    try {
      const saved = localStorage.getItem('divemaster_adopted_signature');
      if (saved) {
        setSavedAdoptedSignature(saved);
      }
    } catch {
      // Ignore storage errors
    }
  }, [studentId]);

  const startEvaluation = (req: PendingReq) => {
    setActiveReq(req);
    setErrorMsg(null);

    try {
      const saved = localStorage.getItem('divemaster_adopted_signature');
      if (saved) {
        setSavedAdoptedSignature(saved);
        setSignatureData(saved);
        setUseAdoptedSignature(true);
      } else {
        setUseAdoptedSignature(false);
        setSignatureData('');
      }
    } catch {
      setUseAdoptedSignature(false);
      setSignatureData('');
    }
  };

  const handleApprove = async () => {
    if (!activeReq) return;
    if (!signatureData) {
      setErrorMsg('Signature is required to approve sign-off.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    if (adoptSignatureCheckbox && signatureData) {
      try {
        localStorage.setItem('divemaster_adopted_signature', signatureData);
        setSavedAdoptedSignature(signatureData);
      } catch {
        // Storage fallback
      }
    }

    try {
      const res = await fetch(`/api/requests/${activeReq.requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signatureData,
          comment: commentInput,
          score: activeReq.scoring === 'SCORE_1_5' ? Number(scoreInput) : undefined,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setErrorMsg(body.error?.message || 'Approval failed');
        setIsSubmitting(false);
        return;
      }

      setActiveReq(null);
      setCommentInput('');
      await loadData();
    } catch {
      setErrorMsg('Approval failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading DMT evaluation details...</div>;
  }

  if (!candidate) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-4">
        <p>Candidate not found.</p>
        <Link href="/instructor">
          <Button variant="outline" className="border-slate-800 text-slate-300">
            Back to Active Candidates
          </Button>
        </Link>
      </div>
    );
  }

  const approved = progress?.approvedUnits || candidate.approvedUnits || 0;
  const pending = progress?.pendingUnits || candidate.pendingCount || 0;
  const notStarted = progress?.notStartedUnits || (53 - approved - pending);
  const percent = progress?.percentComplete || candidate.percentComplete || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header Navigation & Candidate Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 p-6 rounded-xl border border-blue-900/40 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/instructor">
              <Button size="sm" variant="outline" className="border-slate-800 text-slate-400 hover:text-white">
                &larr; Back to Roster
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white">{candidate.studentName}</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            DMT Progress Dashboard • {candidate.email}
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
          {candidate.courseId && (
            <a href={`/api/courses/${candidate.courseId}/pdf`} download>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                Export Evaluation PDF
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* KPI Cards (Matches DMT Dashboard) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400">Total Progress</CardDescription>
            <CardTitle className="text-2xl font-bold text-white">{percent}%</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Progress value={percent} className="h-1.5 bg-slate-800" />
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400">Approved Units</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-400">{approved} / 53</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-400">PADI Standards Satisfied</span>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400">Waiting Review</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-400">{pending}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-400">Pending Instructor Sign-off</span>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400">Remaining Units</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-300">{notStarted}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-400">Not Yet Submitted</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Pie Chart & Section Breakdown */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900 md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-white">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressPie approved={approved} pending={pending} notStarted={notStarted} />
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-white">Progress by Section</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Evaluation section completion tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress?.sections.map((sec) => {
              const secPercent = sec.totalUnits > 0 ? Math.round((sec.approvedUnits / sec.totalUnits) * 100) : 0;
              return (
                <div key={sec.sectionId} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-200">{sec.title}</span>
                    <div className="flex items-center gap-2">
                      {sec.pendingUnits > 0 && (
                        <Badge variant="outline" className="border-amber-500/50 bg-amber-950/40 text-amber-300 text-[10px]">
                          {sec.pendingUnits} pending
                        </Badge>
                      )}
                      <span className="text-slate-400 font-mono">
                        {sec.approvedUnits} / {sec.totalUnits}
                      </span>
                    </div>
                  </div>
                  <Progress value={secPercent} className="h-2 bg-slate-950" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Pending Sign-off Requests Area */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">
            Pending Sign-off Requests ({candidate.pendingCount})
          </h2>
          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {candidate.pendingCount} Awaiting Review
          </Badge>
        </div>

        {candidate.pendingCount === 0 ? (
          <Card className="border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            No pending sign-off requests awaiting review for this candidate.
          </Card>
        ) : (
          <div className="space-y-4">
            {candidate.pendingRequests.map((req) => {
              const isEvaluatingThis = activeReq?.requestId === req.requestId;

              return (
                <Card
                  key={req.requestId}
                  className={`border-slate-800 bg-slate-900 transition-all ${
                    isEvaluatingThis ? 'ring-2 ring-blue-500 border-blue-900' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="border-amber-500/50 bg-amber-950/40 text-amber-300">
                        PENDING EVALUATION
                      </Badge>
                      <span className="text-xs text-slate-400 font-mono">Attempt {req.attemptNumber}</span>
                    </div>
                    <CardTitle className="text-lg font-bold text-white pt-1">{req.title}</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      Performed Date: {new Date(req.performedAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {req.studentNote && (
                      <div className="bg-slate-950/60 p-3 rounded border border-slate-800 italic text-slate-300 text-xs">
                        DMT Note: &quot;{req.studentNote}&quot;
                      </div>
                    )}

                    {/* Embedded Inline Evaluation Form */}
                    {isEvaluatingThis && (
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-5 bg-slate-950/40 p-4 rounded-lg">
                        {errorMsg && (
                          <Alert variant="destructive" className="border-red-900/50 bg-red-950/50 text-red-200 text-sm">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{errorMsg}</AlertDescription>
                          </Alert>
                        )}

                        {req.scoring === 'SCORE_1_5' && (
                          <div className="space-y-2">
                            <Label className="text-slate-200 text-sm font-medium">Performance Score (1-5)</Label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((scoreVal) => (
                                <Button
                                  key={scoreVal}
                                  type="button"
                                  variant={scoreInput === scoreVal ? 'default' : 'outline'}
                                  className={
                                    scoreInput === scoreVal
                                      ? 'bg-blue-600 text-white font-bold flex-1'
                                      : 'border-slate-800 text-slate-300 flex-1'
                                  }
                                  onClick={() => setScoreInput(scoreVal)}
                                >
                                  {scoreVal}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="comment" className="text-slate-200 text-sm font-medium">
                            Instructor Comment (optional)
                          </Label>
                          <Textarea
                            id="comment"
                            placeholder="Feedback for candidate..."
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            className="bg-slate-950 border-slate-800 text-slate-100 min-h-[70px]"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label className="text-slate-200 text-sm font-medium">Instructor Signature *</Label>
                            {savedAdoptedSignature && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs text-blue-400 hover:text-blue-300 p-0 h-auto"
                                onClick={() => setUseAdoptedSignature(!useAdoptedSignature)}
                              >
                                {useAdoptedSignature ? 'Draw New Signature' : 'Use Adopted Signature'}
                              </Button>
                            )}
                          </div>

                          {useAdoptedSignature && savedAdoptedSignature ? (
                            <div className="p-3 border border-green-500/40 bg-green-950/20 rounded-lg space-y-2 text-center">
                              <span className="text-xs text-green-300 font-medium block">✓ Adopted Signature Selected</span>
                              <div className="bg-white p-2 rounded inline-block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={savedAdoptedSignature}
                                  alt="Adopted Instructor Signature"
                                  className="max-h-20 max-w-xs object-contain mx-auto"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <SignaturePad onSave={setSignatureData} />
                              <label className="flex items-center gap-2 pt-1 text-xs text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={adoptSignatureCheckbox}
                                  onChange={(e) => setAdoptSignatureCheckbox(e.target.checked)}
                                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Adopt and save this signature for future quick sign-offs</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-2 flex justify-end gap-3">
                    {isEvaluatingThis ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveReq(null)}
                          className="border-slate-800 text-slate-300"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={isSubmitting || !signatureData}
                          onClick={handleApprove}
                          className="bg-green-600 hover:bg-green-500 text-white font-semibold"
                        >
                          {isSubmitting ? 'Approving...' : 'Confirm & Sign'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => startEvaluation(req)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                      >
                        Evaluate & Sign
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
