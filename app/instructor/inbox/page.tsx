'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SignaturePad } from '@/components/signature-pad';

interface SignoffRequestItem {
  request: {
    id: string;
    courseId: string;
    itemId: number;
    attemptNumber: number;
    status: string;
    performedAt: string;
    studentNote: string | null;
    submittedAt: string;
  };
  item: {
    id: number;
    title: string;
    scoring: string;
    requiredCount: number;
  };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function InstructorInboxPage() {
  const t = useTranslations('Requests');

  const [requests, setRequests] = useState<SignoffRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeRequest, setActiveRequest] = useState<SignoffRequestItem | null>(null);

  // Signature state & Adopt Signature feature
  const [signatureData, setSignatureData] = useState<string>('');
  const [savedAdoptedSignature, setSavedAdoptedSignature] = useState<string | null>(null);
  const [useAdoptedSignature, setUseAdoptedSignature] = useState<boolean>(false);
  const [adoptSignatureCheckbox, setAdoptSignatureCheckbox] = useState<boolean>(true);

  // Approval state
  const [scoreInput, setScoreInput] = useState<number>(4);
  const [commentInput, setCommentInput] = useState<string>('');

  // Rejection state
  const [rejectDialogOpen, setRejectDialogOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchInbox = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/requests?status=PENDING&mine=true');
      if (res.ok) {
        const body = await res.json();
        setRequests(body.requests || []);
      }
    } catch (err) {
      console.error('Failed to load inbox:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
    // Load adopted signature from local storage if available
    try {
      const saved = localStorage.getItem('divemaster_adopted_signature');
      if (saved) {
        setSavedAdoptedSignature(saved);
        setSignatureData(saved);
        setUseAdoptedSignature(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleOpenEvaluation = (reqItem: SignoffRequestItem) => {
    setActiveRequest(reqItem);
    setErrorMsg(null);

    // If an adopted signature is saved, pre-populate it
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
    if (!activeRequest) return;
    if (!signatureData) {
      setErrorMsg('Signature is required to approve sign-off.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // Save adopted signature for future use if checkbox is checked
    if (adoptSignatureCheckbox && signatureData) {
      try {
        localStorage.setItem('divemaster_adopted_signature', signatureData);
        setSavedAdoptedSignature(signatureData);
      } catch {
        // Storage fallback
      }
    }

    try {
      const res = await fetch(`/api/requests/${activeRequest.request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signatureData,
          comment: commentInput,
          score: activeRequest.item.scoring === 'SCORE_1_5' ? Number(scoreInput) : undefined,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setErrorMsg(body.error?.message || 'Approval failed');
        setIsSubmitting(false);
        return;
      }

      setActiveRequest(null);
      setCommentInput('');
      await fetchInbox();
    } catch {
      setErrorMsg('Approval failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!activeRequest) return;
    if (!rejectionReason.trim()) {
      setErrorMsg('Rejection reason is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/requests/${activeRequest.request.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: rejectionReason,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setErrorMsg(body.error?.message || 'Rejection failed');
        setIsSubmitting(false);
        return;
      }

      setRejectDialogOpen(false);
      setActiveRequest(null);
      setRejectionReason('');
      fetchInbox();
    } catch {
      setErrorMsg('Rejection failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('inboxTitle')}</h1>
            <p className="text-slate-400 text-sm">{t('inboxSubtitle')}</p>
          </div>
          {savedAdoptedSignature && (
            <Badge variant="outline" className="border-green-500/50 bg-green-950/40 text-green-300 text-xs">
              ✓ Adopted Signature Ready
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">Loading pending requests...</div>
        ) : requests.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            {t('noRequests')}
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {requests.map(({ request, item, student }) => (
              <Card key={request.id} className="border-slate-800 bg-slate-900 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="border-amber-500/50 bg-amber-950/40 text-amber-300">
                      PENDING
                    </Badge>
                    <span className="text-xs text-slate-400">
                      Attempt {request.attemptNumber} of {item.requiredCount}
                    </span>
                  </div>
                  <CardTitle className="text-lg text-white font-semibold pt-2">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-slate-300 text-sm font-medium">
                    DMT: {student.firstName} {student.lastName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-500 font-semibold">Performed:</span>{' '}
                    {new Date(request.performedAt).toLocaleDateString()}
                  </div>
                  {request.studentNote && (
                    <div className="bg-slate-950/60 p-2 rounded border border-slate-800 italic text-slate-300">
                      &quot;{request.studentNote}&quot;
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
                    onClick={() => handleOpenEvaluation({ request, item, student })}
                  >
                    Evaluate & Sign
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Evaluation & Signature Dialog */}
      {activeRequest && (
        <Dialog open={!!activeRequest} onOpenChange={(open) => !open && setActiveRequest(null)}>
          <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                Evaluate: {activeRequest.item.title}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Candidate: {activeRequest.student.firstName} {activeRequest.student.lastName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {errorMsg && (
                <Alert variant="destructive" className="border-red-900/50 bg-red-950/50 text-red-200 text-sm">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              {/* Score Input if SCORE_1_5 */}
              {activeRequest.item.scoring === 'SCORE_1_5' && (
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

              {/* Instructor Comment */}
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

              {/* Signature Capture & Adoption Section */}
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

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="destructive"
                className="w-full sm:w-auto bg-red-900 hover:bg-red-800 text-red-100"
                onClick={() => setRejectDialogOpen(true)}
              >
                Reject Request
              </Button>
              <Button
                className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white font-semibold"
                disabled={isSubmitting || !signatureData}
                onClick={handleApprove}
              >
                {isSubmitting ? 'Approving...' : 'Approve & Sign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-400">Reject Sign-off Request</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Please provide a clear reason for rejecting this candidate request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reject-reason" className="text-slate-200 text-sm font-medium">
                Rejection Reason *
              </Label>
              <Textarea
                id="reject-reason"
                placeholder="Explain why this request is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="border-slate-800 text-slate-300">
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isSubmitting || !rejectionReason.trim()}
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
