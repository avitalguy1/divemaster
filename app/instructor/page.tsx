'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CandidateOverview {
  studentId: string;
  studentName: string;
  email: string;
  courseId: string;
  approvedUnits: number;
  percentComplete: number;
  status: string;
  pendingCount: number;
}

export default function InstructorPage() {
  const [candidates, setCandidates] = useState<CandidateOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reset Password Modal State
  const [activeResetUser, setActiveResetUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('Password123!');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const loadCandidates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/instructors/candidates');
      if (res.ok) {
        const body = await res.json();
        setCandidates(body.candidates || []);
      }
    } catch (err) {
      console.error('Failed to load candidate list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResetUser) return;
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setResetError('New password must be at least 6 characters.');
      return;
    }

    setIsSubmittingReset(true);
    setResetError(null);

    try {
      const res = await fetch(`/api/users/${activeResetUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordInput }),
      });

      const body = await res.json();
      if (!res.ok) {
        setResetError(body.error?.message || 'Failed to reset password');
        setIsSubmittingReset(false);
        return;
      }

      alert(`Password for candidate ${activeResetUser.name} was successfully reset!`);
      setActiveResetUser(null);
      setNewPasswordInput('Password123!');
    } catch {
      setResetError('Failed to reset password');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto pb-20 sm:pb-8 md:pl-72">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-600 p-6 sm:p-8 rounded-2xl text-white shadow-lg shadow-sky-600/15">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Instructor Dashboard</h1>
          <p className="text-sm text-sky-100 mt-1 font-medium">
            Active Divemaster candidates, pending sign-offs, and progress tracking
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/instructor/inbox">
            <Button className="bg-white text-sky-800 hover:bg-sky-50 font-bold shadow-sm">
              Go to Full Inbox
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border border-slate-200/80 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">Active Candidates Roster</CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            Click on any candidate to view their evaluation dashboard, evaluate pending requests, or reset candidate credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 font-medium">Loading candidate roster...</div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">No active DMT candidates found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-700 font-bold">Candidate</TableHead>
                  <TableHead className="text-slate-700 font-bold">Status</TableHead>
                  <TableHead className="text-slate-700 font-bold">Pending Requests</TableHead>
                  <TableHead className="text-slate-700 font-bold">Approved Units</TableHead>
                  <TableHead className="text-slate-700 font-bold">Overall Progress</TableHead>
                  <TableHead className="text-right text-slate-700 font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((cand) => (
                  <TableRow key={cand.studentId} className="border-slate-200 hover:bg-sky-50/40 transition-colors">
                    <TableCell className="font-bold text-slate-800">
                      <Link href={`/instructor/candidates/${cand.studentId}`} className="text-base text-sky-700 hover:text-sky-800 hover:underline">
                        {cand.studentName}
                      </Link>
                      <div className="text-xs text-slate-500 font-normal">{cand.email}</div>
                    </TableCell>

                    <TableCell>
                      {cand.status === 'COMPLETE' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold">
                          COMPLETE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700 font-semibold">
                          IN TRAINING
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {cand.pendingCount > 0 ? (
                        <Link href={`/instructor/candidates/${cand.studentId}`}>
                          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-xs px-2.5 py-1 font-bold cursor-pointer hover:bg-amber-200">
                            {cand.pendingCount} Pending
                          </Badge>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None</span>
                      )}
                    </TableCell>

                    <TableCell className="font-mono font-bold text-slate-700">
                      {cand.approvedUnits} / 53
                    </TableCell>

                    <TableCell className="w-44">
                      <div className="space-y-1">
                        <div className="text-xs text-slate-600 font-mono font-bold text-right">{cand.percentComplete}%</div>
                        <Progress value={cand.percentComplete} className="h-2 bg-slate-100" />
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Link href={`/instructor/candidates/${cand.studentId}`}>
                          <Button size="sm" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs">
                            Review Candidate
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveResetUser({ id: cand.studentId, name: cand.studentName, email: cand.email });
                            setResetError(null);
                          }}
                          className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs"
                        >
                          Reset Password
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reset Candidate Password Modal */}
      <Dialog open={!!activeResetUser} onOpenChange={(open) => !open && setActiveResetUser(null)}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900">Reset Candidate Password</DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              Enter a new password for DMT candidate {activeResetUser?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
            {resetError && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 text-sm">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{resetError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs font-semibold">Candidate Account</Label>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-sm font-bold text-slate-800">
                {activeResetUser?.name} ({activeResetUser?.email})
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password-inst" className="text-slate-700 text-xs font-semibold">New Password *</Label>
              <Input
                id="new-password-inst"
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 font-mono"
                required
                minLength={6}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveResetUser(null)}
                className="border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingReset}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs"
              >
                {isSubmittingReset ? 'Resetting Password...' : 'Save New Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
