'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  padiNumber: string | null;
}

interface RequestItem {
  request: {
    id: string;
    courseId: string;
    itemId: number;
    attemptNumber: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'VOIDED';
    performedAt: string;
    studentNote: string | null;
    instructorId: string;
    instructorNameSnapshot: string | null;
    rejectionReason: string | null;
    voidReason: string | null;
    submittedAt: string;
  };
  item: {
    id: number;
    title: string;
  };
}

export default function StudentRequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Reassign state
  const [editingRequest, setEditingRequest] = useState<RequestItem | null>(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('');
  const [studentNote, setStudentNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const [reqRes, instRes] = await Promise.all([
        fetch('/api/requests?mine=true'),
        fetch('/api/instructors'),
      ]);

      if (reqRes.ok) {
        const body = await reqRes.json();
        setRequests(body.requests || []);
      }
      if (instRes.ok) {
        const body = await instRes.json();
        setInstructors(body.instructors || []);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleUpdate = async () => {
    if (!editingRequest) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/requests/${editingRequest.request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructorId: selectedInstructorId || undefined,
          studentNote,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setErrorMsg(body.error?.message || 'Update failed');
        setIsSubmitting(false);
        return;
      }

      setEditingRequest(null);
      loadRequests();
    } catch {
      setErrorMsg('Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (requestId: string) => {
    if (!confirm('Are you sure you want to withdraw this pending request?')) return;

    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadRequests();
      }
    } catch (err) {
      console.error('Failed to withdraw request:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white">My Sign-off Requests</h1>
          <p className="text-sm text-slate-400">
            Track, reassign target instructors, or withdraw pending evaluation requests
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/requests/new">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
              + New Request
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="border-slate-800 text-slate-300">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-slate-400">Loading your requests...</div>
      ) : requests.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
          You haven&apos;t submitted any sign-off requests yet.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {requests.map(({ request, item }) => {
            const currentInst = instructors.find((i) => i.id === request.instructorId);

            return (
              <Card key={request.id} className="border-slate-800 bg-slate-900 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    {request.status === 'APPROVED' ? (
                      <Badge className="bg-green-600/20 text-green-300 border border-green-500/30">
                        APPROVED
                      </Badge>
                    ) : request.status === 'PENDING' ? (
                      <Badge variant="outline" className="border-amber-500/50 bg-amber-950/40 text-amber-300">
                        PENDING
                      </Badge>
                    ) : request.status === 'REJECTED' ? (
                      <Badge className="bg-red-600/20 text-red-300 border border-red-500/30">
                        REJECTED
                      </Badge>
                    ) : (
                      <Badge className="bg-purple-600/20 text-purple-300 border border-purple-500/30">
                        VOIDED
                      </Badge>
                    )}
                    <span className="text-xs text-slate-400 font-mono">Attempt {request.attemptNumber}</span>
                  </div>
                  <CardTitle className="text-lg font-bold text-white pt-2">{item.title}</CardTitle>
                  <CardDescription className="text-slate-300 text-xs">
                    Target Instructor:{' '}
                    <span className="font-semibold text-blue-400">
                      {request.instructorNameSnapshot ||
                        (currentInst ? `${currentInst.firstName} ${currentInst.lastName}` : 'Assigned Instructor')}
                    </span>
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
                  {request.rejectionReason && (
                    <div className="bg-red-950/40 p-2 rounded border border-red-900/50 text-red-200">
                      <strong>Rejection reason:</strong> {request.rejectionReason}
                    </div>
                  )}
                  {request.voidReason && (
                    <div className="bg-purple-950/40 p-2 rounded border border-purple-900/50 text-purple-200">
                      <strong>Void reason:</strong> {request.voidReason}
                    </div>
                  )}
                </CardContent>

                {request.status === 'PENDING' && (
                  <CardFooter className="pt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-slate-700 text-slate-200 hover:bg-slate-800"
                      onClick={() => {
                        setEditingRequest({ request, item });
                        setSelectedInstructorId(request.instructorId);
                        setStudentNote(request.studentNote || '');
                        setErrorMsg(null);
                      }}
                    >
                      Reassign / Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/50"
                      onClick={() => handleWithdraw(request.id)}
                    >
                      Withdraw
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit / Reassign Dialog */}
      {editingRequest && (
        <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
          <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white">Reassign Instructor / Edit Note</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Item: {editingRequest.item.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {errorMsg && (
                <Alert variant="destructive" className="border-red-900/50 bg-red-950/50 text-red-200 text-sm">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              {(() => {
                const selectedInst = instructors.find((i) => i.id === selectedInstructorId);
                const selectedInstLabel = selectedInst
                  ? `${selectedInst.firstName} ${selectedInst.lastName}`
                  : undefined;

                return (
                  <div className="space-y-2">
                    <Label htmlFor="inst-select" className="text-slate-200 text-sm font-medium">
                      Select Correct Instructor *
                    </Label>
                    <Select value={selectedInstructorId} onValueChange={(val) => setSelectedInstructorId(val || '')}>
                      <SelectTrigger id="inst-select" className="bg-slate-950 border-slate-800 text-slate-100 h-11 w-full">
                        <SelectValue placeholder="Select instructor...">
                          {selectedInstLabel || undefined}
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
                );
              })()}

              <div className="space-y-2">
                <Label htmlFor="note-edit" className="text-slate-200 text-sm font-medium">
                  DMT Note
                </Label>
                <Textarea
                  id="note-edit"
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingRequest(null)} className="border-slate-800 text-slate-300">
                Cancel
              </Button>
              <Button
                disabled={isSubmitting || !selectedInstructorId}
                onClick={handleUpdate}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
