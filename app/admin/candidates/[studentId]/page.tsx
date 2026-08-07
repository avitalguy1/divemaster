'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SignaturePad } from '@/components/signature-pad';

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
  pendingRequests: PendingReq[];
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

export default function AdminCandidateReportPage({ params }: { params: Promise<{ studentId: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.studentId;

  const [candidate, setCandidate] = useState<CandidateOverview | null>(null);
  const [sections, setSections] = useState<SectionProgress[]>([]);
  const [sectionItems, setSectionItems] = useState<CatalogSectionItems[]>([]);
  const [expandedSectionId, setExpandedSectionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active evaluation state for pending requests
  const [activeReq, setActiveReq] = useState<PendingReq | null>(null);
  const evalSectionRef = useRef<HTMLDivElement | null>(null);
  const [signatureData, setSignatureData] = useState<string>('');
  const [savedAdoptedSignature, setSavedAdoptedSignature] = useState<string | null>(null);
  const [useAdoptedSignature, setUseAdoptedSignature] = useState<boolean>(false);
  const [adoptSignatureCheckbox, setAdoptSignatureCheckbox] = useState<boolean>(true);
  const [scoreInput, setScoreInput] = useState<number>(4);
  const [commentInput, setCommentInput] = useState<string>('');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);
  const [evalErrorMsg, setEvalErrorMsg] = useState<string | null>(null);

  // Void modal state
  const [activeVoidReq, setActiveVoidReq] = useState<ApprovedRecord | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isSubmittingVoid, setIsSubmittingVoid] = useState(false);
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
            setSections(progData.progress?.sections || []);
          }

          if (itemsRes.ok) {
            const itemsData = await itemsRes.json();
            setSectionItems(itemsData.sections || []);
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

    try {
      const saved = localStorage.getItem('divemaster_adopted_signature');
      if (saved) {
        setSavedAdoptedSignature(saved);
      }
    } catch {
      // Storage fallback
    }
  }, [studentId]);

  const startEvaluation = (req: PendingReq) => {
    setActiveReq(req);
    setEvalErrorMsg(null);

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
      setEvalErrorMsg('Signature is required to approve sign-off.');
      return;
    }

    setIsSubmittingEval(true);
    setEvalErrorMsg(null);

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
        setEvalErrorMsg(body.error?.message || 'Approval failed');
        setIsSubmittingEval(false);
        return;
      }

      setActiveReq(null);
      setCommentInput('');
      await loadData();
    } catch {
      setEvalErrorMsg('Approval failed');
    } finally {
      setIsSubmittingEval(false);
    }
  };

  const handleVoidRequest = async () => {
    if (!activeVoidReq) return;
    if (!voidReason.trim()) {
      setErrorMsg('A void reason is required by PADI audit standards.');
      return;
    }

    setIsSubmittingVoid(true);
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
        setIsSubmittingVoid(false);
        return;
      }

      setActiveVoidReq(null);
      setVoidReason('');
      await loadData();
    } catch {
      setErrorMsg('Void action failed');
    } finally {
      setIsSubmittingVoid(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!candidate) return;
    if (!confirm(`Are you sure you want to delete DMT candidate "${candidate.studentName}"?`)) {
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

  const pendingList = candidate.pendingRequests || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto pb-20 sm:pb-8">
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
            <CardTitle className="text-3xl font-extrabold text-amber-600">{pendingList.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500">Awaiting Sign-off</span>
          </CardContent>
        </Card>
      </div>

      {/* Pending Sign-off Requests Area */}
      {pendingList.length > 0 && (
        <div ref={evalSectionRef} className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">
              Pending Sign-off Requests ({pendingList.length})
            </h2>
            <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-bold">
              {pendingList.length} Awaiting Evaluation
            </Badge>
          </div>

          <div className="space-y-4">
            {pendingList.map((req) => {
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

                    {/* Embedded Evaluation Form */}
                    {isEvaluatingThis && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-5 bg-sky-50/40 p-4 rounded-xl">
                        {evalErrorMsg && (
                          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 text-sm">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{evalErrorMsg}</AlertDescription>
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
                          <Label htmlFor="comment-admin" className="text-slate-800 text-sm font-semibold">
                            Instructor Comment (optional)
                          </Label>
                          <Textarea
                            id="comment-admin"
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
                          disabled={isSubmittingEval || !signatureData}
                          onClick={handleApprove}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs"
                        >
                          {isSubmittingEval ? 'Approving...' : 'Confirm & Sign'}
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
        </div>
      )}

      {/* Section Progress Breakdown Table (Clickable Accordion) */}
      <Card className="border border-slate-200/80 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">Progress Breakdown by Catalog Section</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Click any section below to expand requirement items and inspect task details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sections.map((sec) => {
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
                  <div className="border-t border-slate-200 bg-white p-3 space-y-2">
                    {!secData || !secData.items || secData.items.length === 0 ? (
                      <div className="text-xs text-slate-500 italic py-2 text-center">No requirement items in this section.</div>
                    ) : (
                      secData.items.map((item) => {
                        const pendingForThisItem = pendingList.find((r) => r.itemId === item.id);

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
              disabled={isSubmittingVoid || !voidReason.trim()}
              onClick={handleVoidRequest}
              className="bg-red-600 hover:bg-red-500 text-white font-bold shadow-xs"
            >
              {isSubmittingVoid ? 'Voiding...' : 'Confirm Void Action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
