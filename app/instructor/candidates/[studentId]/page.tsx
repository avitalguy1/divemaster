'use client';

import { useState, useEffect, use, useRef } from 'react';
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

interface CatalogItem {
  id: number;
  sectionId: number;
  code: string;
  title: string;
  scoring: string;
  requiredCount: number;
  status: 'APPROVED' | 'PENDING' | 'NOT_STARTED';
  approvedCount: number;
  pendingCount: number;
}

interface CatalogSectionItems {
  id?: number;
  sectionId?: number;
  code: string;
  title: string;
  items: CatalogItem[];
}

export default function CandidateDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.studentId;

  const [candidate, setCandidate] = useState<CandidateOverview | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [sectionItems, setSectionItems] = useState<CatalogSectionItems[]>([]);
  const [expandedSectionId, setExpandedSectionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active evaluating request
  const [activeReq, setActiveReq] = useState<PendingReq | null>(null);
  const evalSectionRef = useRef<HTMLDivElement | null>(null);

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
          const [progRes, itemsRes] = await Promise.all([
            fetch(`/api/courses/${cand.courseId}/progress`),
            fetch(`/api/courses/${cand.courseId}/items`),
          ]);

          if (progRes.ok) {
            const progData = await progRes.json();
            setProgress(progData.progress || null);
          }

          if (itemsRes.ok) {
            const itemsData = await itemsRes.json();
            setSectionItems(itemsData.sections || []);
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

    setTimeout(() => {
      evalSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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
    return <div className="p-12 text-center text-slate-500 font-medium">Loading DMT evaluation details...</div>;
  }

  if (!candidate) {
    return (
      <div className="p-12 text-center text-slate-600 space-y-4">
        <p className="font-semibold text-lg">Candidate not found.</p>
        <Link href="/instructor">
          <Button variant="outline" className="border-slate-300 text-slate-700">
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
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header Navigation & Candidate Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-600 p-6 sm:p-8 rounded-2xl text-white shadow-lg shadow-sky-600/15">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/instructor">
              <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 font-medium">
                &larr; Back to Roster
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold">{candidate.studentName}</h1>
          </div>
          <p className="text-sm text-sky-100 mt-1 font-medium">
            DMT Progress Dashboard • {candidate.email}
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
          {candidate.courseId && (
            <a href={`/api/courses/${candidate.courseId}/pdf`} download>
              <Button size="sm" className="bg-white text-sky-800 hover:bg-sky-50 font-bold shadow-sm">
                Export Evaluation PDF
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium">Total Progress</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-sky-700">{percent}%</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Progress value={percent} className="h-2 bg-slate-100" />
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium">Approved Units</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-emerald-600">{approved} / 53</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500">PADI Standards Satisfied</span>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium">Waiting Review</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-amber-600">{pending}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500">Pending Sign-off</span>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium">Remaining Units</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-slate-600">{notStarted}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500">Not Yet Submitted</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Pie Chart & Section Breakdown */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-slate-200/80 bg-white shadow-xs md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressPie approved={approved} pending={pending} notStarted={notStarted} />
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-xs md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800">Progress by Section</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Click any section below to view candidate sign-off status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {progress?.sections.map((sec) => {
              const secPercent = sec.totalUnits > 0 ? Math.round((sec.approvedUnits / sec.totalUnits) * 100) : 0;
              const isExpanded = expandedSectionId === sec.sectionId;
              const secData = sectionItems.find((s: any) => (s.id ?? s.sectionId) === sec.sectionId);

              return (
                <div
                  key={sec.sectionId}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 transition-all overflow-hidden"
                >
                  {/* Clickable Header Row */}
                  <div
                    onClick={() => setExpandedSectionId(isExpanded ? null : sec.sectionId)}
                    className="p-3.5 cursor-pointer hover:bg-sky-50/60 transition-colors space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-sky-600 font-bold text-sm">{isExpanded ? '▲' : '▼'}</span>
                        <span className="font-bold text-slate-800 text-sm">{sec.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {sec.pendingUnits > 0 && (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-semibold">
                            {sec.pendingUnits} pending
                          </Badge>
                        )}
                        <span className="text-slate-600 font-mono text-xs font-semibold">
                          {sec.approvedUnits} / {sec.totalUnits} units ({secPercent}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={secPercent} className="h-2 bg-slate-200" />
                  </div>

                  {/* Expanded Items List */}
                  {isExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="border-t border-slate-200 bg-white p-3 space-y-2"
                    >
                      {!secData || !secData.items || secData.items.length === 0 ? (
                        <div className="text-xs text-slate-500 italic py-2 text-center">No requirement items in this section.</div>
                      ) : (
                        secData.items.map((item) => {
                          const pendingForThisItem = candidate.pendingRequests.find((r) => r.itemId === item.id);

                          return (
                            <div
                              key={item.id}
                              className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-800">{item.title}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Required count: {item.requiredCount} {item.requiredCount > 1 ? `(${item.approvedCount}/${item.requiredCount} approved)` : ''}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                {item.status === 'APPROVED' ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-semibold">
                                    ✓ APPROVED
                                  </Badge>
                                ) : item.status === 'PENDING' ? (
                                  <Badge className="bg-amber-50 text-amber-700 border border-amber-300 text-[10px] font-semibold">
                                    ⏳ PENDING
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-slate-300 text-slate-500 text-[10px]">
                                    NOT STARTED
                                  </Badge>
                                )}

                                {pendingForThisItem && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEvaluation(pendingForThisItem);
                                    }}
                                    className="h-7 text-[11px] bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-2xs"
                                  >
                                    Evaluate & Sign
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Pending Sign-off Requests Area */}
      <div ref={evalSectionRef} className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">
            Pending Sign-off Requests ({candidate.pendingCount})
          </h2>
          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-bold">
            {candidate.pendingCount} Awaiting Review
          </Badge>
        </div>

        {candidate.pendingCount === 0 ? (
          <Card className="border border-slate-200/80 bg-white p-8 text-center text-slate-500 shadow-xs">
            No pending sign-off requests awaiting review for this candidate.
          </Card>
        ) : (
          <div className="space-y-4">
            {candidate.pendingRequests.map((req) => {
              const isEvaluatingThis = activeReq?.requestId === req.requestId;

              return (
                <Card
                  key={req.requestId}
                  className={`border transition-all shadow-xs bg-white ${
                    isEvaluatingThis ? 'ring-2 ring-sky-500 border-sky-300 shadow-md' : 'border-slate-200/80'
                  }`}
                >
                  <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100 rounded-t-xl">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 font-semibold">
                        PENDING EVALUATION
                      </Badge>
                      <span className="text-xs text-slate-500 font-mono">Attempt {req.attemptNumber}</span>
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-800 pt-1">{req.title}</CardTitle>
                    <CardDescription className="text-slate-500 text-xs">
                      Performed Date: {new Date(req.performedAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-4">
                    {req.studentNote && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 italic text-slate-700 text-xs">
                        DMT Note: &quot;{req.studentNote}&quot;
                      </div>
                    )}

                    {/* Embedded Inline Evaluation Form */}
                    {isEvaluatingThis && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-5 bg-sky-50/40 p-4 rounded-xl">
                        {errorMsg && (
                          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 text-sm">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{errorMsg}</AlertDescription>
                          </Alert>
                        )}

                        {req.scoring === 'SCORE_1_5' && (
                          <div className="space-y-2">
                            <Label className="text-slate-800 text-sm font-semibold">Performance Score (1-5)</Label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((scoreVal) => (
                                <Button
                                  key={scoreVal}
                                  type="button"
                                  variant={scoreInput === scoreVal ? 'default' : 'outline'}
                                  className={
                                    scoreInput === scoreVal
                                      ? 'bg-sky-600 text-white font-bold flex-1 shadow-xs'
                                      : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-100 flex-1'
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
                          <Label htmlFor="comment" className="text-slate-800 text-sm font-semibold">
                            Instructor Comment (optional)
                          </Label>
                          <Textarea
                            id="comment"
                            placeholder="Feedback for candidate..."
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            className="bg-white border-slate-300 text-slate-900 min-h-[70px]"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label className="text-slate-800 text-sm font-semibold">Instructor Signature *</Label>
                            {savedAdoptedSignature && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs text-sky-700 hover:text-sky-800 p-0 h-auto font-medium"
                                onClick={() => setUseAdoptedSignature(!useAdoptedSignature)}
                              >
                                {useAdoptedSignature ? 'Draw New Signature' : 'Use Adopted Signature'}
                              </Button>
                            )}
                          </div>

                          {useAdoptedSignature && savedAdoptedSignature ? (
                            <div className="p-3 border border-emerald-300 bg-emerald-50 rounded-lg space-y-2 text-center">
                              <span className="text-xs text-emerald-800 font-bold block">✓ Adopted Signature Selected</span>
                              <div className="bg-white p-2 rounded inline-block shadow-2xs border border-slate-200">
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
                              <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 cursor-pointer font-medium">
                                <input
                                  type="checkbox"
                                  checked={adoptSignatureCheckbox}
                                  onChange={(e) => setAdoptSignatureCheckbox(e.target.checked)}
                                  className="rounded border-slate-300 bg-white text-sky-600 focus:ring-sky-500"
                                />
                                <span>Adopt and save this signature for future quick sign-offs</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-2 flex justify-end gap-3 pb-4">
                    {isEvaluatingThis ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveReq(null)}
                          className="border-slate-300 text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={isSubmitting || !signatureData}
                          onClick={handleApprove}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs"
                        >
                          {isSubmitting ? 'Approving...' : 'Confirm & Sign'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => startEvaluation(req)}
                        className="bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs"
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
