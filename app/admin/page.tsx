'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  isActive?: boolean;
  isArchived?: boolean;
  approvedUnits: number;
  percentComplete: number;
  status: string;
  pendingCount: number;
}

interface AuditLogEntry {
  id: number;
  actor: {
    name: string;
    email: string;
    role: string;
  };
  entity: string;
  entityId: string;
  action: string;
  before: any;
  after: any;
  createdAt: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'dmts' | 'archive' | 'deleted' | 'reports'>('dmts');
  const [searchQuery, setSearchQuery] = useState('');

  // DMTs State
  const [candidates, setCandidates] = useState<CandidateOverview[]>([]);
  // Reports / Audit State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Reset Password Modal State
  const [activeResetUser, setActiveResetUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('Password123!');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [candRes, auditRes] = await Promise.all([
        fetch('/api/instructors/candidates'),
        fetch('/api/audit-logs'),
      ]);

      if (candRes.ok) {
        const body = await candRes.json();
        setCandidates(body.candidates || []);
      }

      if (auditRes.ok) {
        const body = await auditRes.json();
        setAuditLogs(body.logs || []);
      }
    } catch (err) {
      console.error('Failed to load admin panel data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
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

      alert(`Password for ${activeResetUser.name} was successfully reset!`);
      setActiveResetUser(null);
      setNewPasswordInput('Password123!');
    } catch {
      setResetError('Failed to reset password');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleDeleteCandidate = async (studentId: string, studentName: string) => {
    if (!confirm(`Move candidate "${studentName}" to Deleted DMTs?\n\nThey will be deactivated and moved to the Deleted tab where they can be restored at any time.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/candidates/${studentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadAdminData();
      } else {
        const body = await res.json();
        alert(body.error?.message || 'Failed to delete candidate');
      }
    } catch {
      alert('Failed to delete candidate');
    }
  };

  const handleRestoreCandidate = async (studentId: string, studentName: string) => {
    if (!confirm(`Restore candidate "${studentName}" to Active DMTs?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/candidates/${studentId}/restore`, {
        method: 'POST',
      });

      if (res.ok) {
        loadAdminData();
      } else {
        const body = await res.json();
        alert(body.error?.message || 'Failed to restore candidate');
      }
    } catch {
      alert('Failed to restore candidate');
    }
  };

  const handleArchiveCandidate = async (studentId: string, studentName: string, isArchived: boolean) => {
    const actionText = isArchived ? 'Archive' : 'Unarchive';
    if (!confirm(`Are you sure you want to ${actionText.toLowerCase()} candidate "${studentName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/candidates/${studentId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived }),
      });

      if (res.ok) {
        loadAdminData();
      } else {
        const body = await res.json();
        alert(body.error?.message || `Failed to ${actionText.toLowerCase()} candidate`);
      }
    } catch {
      alert(`Failed to ${actionText.toLowerCase()} candidate`);
    }
  };

  // Filter candidates by search query and tabs
  const query = searchQuery.trim().toLowerCase();

  const activeCandidates = candidates.filter(
    (c) => c.isActive !== false && c.isArchived !== true && (
      !query || c.studentName.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
    )
  );

  const archivedCandidates = candidates.filter(
    (c) => c.isActive !== false && c.isArchived === true && (
      !query || c.studentName.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
    )
  );

  const deletedCandidates = candidates.filter(
    (c) => c.isActive === false && (
      !query || c.studentName.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
    )
  );

  const totalActiveCount = candidates.filter((c) => c.isActive !== false && c.isArchived !== true).length;
  const totalArchivedCount = candidates.filter((c) => c.isActive !== false && c.isArchived === true).length;
  const totalDeletedCount = candidates.filter((c) => c.isActive === false).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:pl-64">
      <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto pb-20 sm:pb-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-600 p-6 sm:p-8 rounded-2xl text-white shadow-lg shadow-sky-600/15">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Admin Management Panel</h1>
          <p className="text-sm text-sky-100 mt-1 font-medium">
            Manage DMT Candidates, Graduated Archives, and Audit Records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-500 text-white font-bold px-3 py-1 text-xs">
            ADMINISTRATOR ACCESS
          </Badge>
        </div>
      </div>

      {/* Navigation Menu Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <Button
          variant={activeTab === 'dmts' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('dmts')}
          className={
            activeTab === 'dmts'
              ? 'bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
          }
        >
          DMT Candidates ({totalActiveCount})
        </Button>
        <Button
          variant={activeTab === 'archive' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('archive')}
          className={
            activeTab === 'archive'
              ? 'bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
          }
        >
          Archive ({totalArchivedCount})
        </Button>
        <Button
          variant={activeTab === 'deleted' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('deleted')}
          className={
            activeTab === 'deleted'
              ? 'bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
          }
        >
          Deleted DMTs ({totalDeletedCount})
        </Button>
        <Button
          variant={activeTab === 'reports' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('reports')}
          className={
            activeTab === 'reports'
              ? 'bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
          }
        >
          Reports & Audit ({auditLogs.length})
        </Button>
      </div>

      {/* Candidate Search Input Bar */}
      {(activeTab === 'dmts' || activeTab === 'archive' || activeTab === 'deleted') && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <span className="text-slate-400 font-bold text-sm">🔍</span>
          <Input
            type="text"
            placeholder="Search candidates by student name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 font-medium"
          />
          {searchQuery && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Clear Search
            </Button>
          )}
        </div>
      )}

      {/* TAB 1: Active DMTs Roster */}
      {activeTab === 'dmts' && (
        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Active DMT Candidates Roster</CardTitle>
            <CardDescription className="text-slate-500 text-sm">
              Manage active candidates, reset credentials, inspect status reports, or move graduated students to the Archive tab
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-slate-500 font-medium">Loading DMT candidates...</div>
            ) : activeCandidates.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-medium">
                {searchQuery ? 'No candidate matches search query.' : 'No active DMT candidates found.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="text-slate-700 font-bold">DMT Candidate</TableHead>
                    <TableHead className="text-slate-700 font-bold">Training Status</TableHead>
                    <TableHead className="text-slate-700 font-bold">Approved Units</TableHead>
                    <TableHead className="text-slate-700 font-bold">Overall Progress</TableHead>
                    <TableHead className="text-right text-slate-700 font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCandidates.map((cand) => (
                    <TableRow key={cand.studentId} className="border-slate-200 hover:bg-sky-50/40 transition-colors">
                      <TableCell className="font-bold text-slate-800">
                        <Link href={`/admin/candidates/${cand.studentId}`} className="text-base text-sky-700 hover:text-sky-800 hover:underline">
                          {cand.studentName}
                        </Link>
                        <div className="text-xs text-slate-500 font-normal">{cand.email}</div>
                      </TableCell>

                      <TableCell>
                        {cand.status === 'COMPLETE' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold">
                            GRADUATED / COMPLETE
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700 font-semibold">
                            IN TRAINING
                          </Badge>
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
                          <Link href={`/admin/candidates/${cand.studentId}`}>
                            <Button size="sm" className="bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs text-xs">
                              View Report
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveResetUser({ id: cand.studentId, name: cand.studentName, email: cand.email, role: 'DMT Candidate' });
                              setResetError(null);
                            }}
                            className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs"
                          >
                            Reset Password
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleArchiveCandidate(cand.studentId, cand.studentName, true)}
                            className="border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs"
                          >
                            Archive
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteCandidate(cand.studentId, cand.studentName)}
                            className="border-red-200 text-red-700 hover:bg-red-50 font-medium text-xs"
                          >
                            Delete
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
      )}

      {/* TAB 2: Archive Folder (Graduated & Archived Candidates) */}
      {activeTab === 'archive' && (
        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Graduated & Archived Candidates</CardTitle>
            <CardDescription className="text-slate-500 text-sm">
              Archive folder for completed DMT graduates. Use search above or click Unarchive to restore to active roster.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-slate-500 font-medium">Loading archived candidates...</div>
            ) : archivedCandidates.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-medium">
                {searchQuery ? 'No archived candidate matches search query.' : 'No archived candidate records found.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="text-slate-700 font-bold">Candidate</TableHead>
                    <TableHead className="text-slate-700 font-bold">Status</TableHead>
                    <TableHead className="text-slate-700 font-bold">Approved Units</TableHead>
                    <TableHead className="text-slate-700 font-bold">Completion</TableHead>
                    <TableHead className="text-right text-slate-700 font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedCandidates.map((cand) => (
                    <TableRow key={cand.studentId} className="border-slate-200 hover:bg-sky-50/40 transition-colors">
                      <TableCell className="font-bold text-slate-800">
                        <Link href={`/admin/candidates/${cand.studentId}`} className="text-base text-sky-700 hover:text-sky-800 hover:underline">
                          {cand.studentName}
                        </Link>
                        <div className="text-xs text-slate-500 font-normal">{cand.email}</div>
                      </TableCell>

                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                          📁 ARCHIVED GRADUATE
                        </Badge>
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
                          <Link href={`/admin/candidates/${cand.studentId}`}>
                            <Button size="sm" className="bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs text-xs">
                              View Report
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveResetUser({ id: cand.studentId, name: cand.studentName, email: cand.email, role: 'DMT Candidate' });
                              setResetError(null);
                            }}
                            className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs"
                          >
                            Reset Password
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleArchiveCandidate(cand.studentId, cand.studentName, false)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs text-xs"
                          >
                            Unarchive Candidate
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
      )}

      {/* TAB 3: Deleted DMTs */}
      {activeTab === 'deleted' && (
        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Deleted DMT Candidates</CardTitle>
            <CardDescription className="text-slate-500 text-sm">
              Soft-deleted candidate accounts. Click Restore to move any candidate back to the active roster.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-slate-500 font-medium">Loading deleted candidates...</div>
            ) : deletedCandidates.length === 0 ? (
              <div className="py-12 text-center text-slate-500 italic">
                {searchQuery ? 'No deleted candidate matches search query.' : 'No deleted DMT candidates in bin.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="text-slate-700 font-bold">Candidate</TableHead>
                    <TableHead className="text-slate-700 font-bold">Status</TableHead>
                    <TableHead className="text-slate-700 font-bold">Approved Units</TableHead>
                    <TableHead className="text-slate-700 font-bold">Progress</TableHead>
                    <TableHead className="text-right text-slate-700 font-bold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedCandidates.map((cand) => (
                    <TableRow key={cand.studentId} className="border-slate-200 hover:bg-slate-50 transition-colors">
                      <TableCell className="font-bold text-slate-800">
                        {cand.studentName}
                        <div className="text-xs text-slate-500 font-normal">{cand.email}</div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 font-semibold">
                          DELETED / INACTIVE
                        </Badge>
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
                        <Button
                          size="sm"
                          onClick={() => handleRestoreCandidate(cand.studentId, cand.studentName)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs text-xs"
                        >
                          Restore Candidate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: Reports & Audit Log */}
      {activeTab === 'reports' && (
        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Audit & Evaluation Log</CardTitle>
            <CardDescription className="text-slate-500 text-sm">
              Immutable audit log of evaluations, approvals, void actions, and administrative changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-slate-500 font-medium">Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-medium">No audit log entries recorded.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="text-slate-700 font-bold">Timestamp</TableHead>
                    <TableHead className="text-slate-700 font-bold">Actor</TableHead>
                    <TableHead className="text-slate-700 font-bold">Action</TableHead>
                    <TableHead className="text-slate-700 font-bold">Target Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} className="border-slate-200 hover:bg-sky-50/40 transition-colors">
                      <TableCell className="font-mono text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-800 font-bold">
                        {log.actor.name} ({log.actor.role})
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800 font-mono text-xs font-bold">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {log.entity}:{log.entityId.substring(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reset Password Modal */}
      <Dialog open={!!activeResetUser} onOpenChange={(open) => !open && setActiveResetUser(null)}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900">Reset User Password</DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              Enter a new password for {activeResetUser?.name} ({activeResetUser?.role}).
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
              <Label className="text-slate-700 text-xs font-semibold">User Account</Label>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-sm font-bold text-slate-800">
                {activeResetUser?.name} ({activeResetUser?.email})
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-slate-700 text-xs font-semibold">New Password *</Label>
              <Input
                id="new-password"
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
  </div>
);
}
