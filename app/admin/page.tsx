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
  approvedUnits: number;
  percentComplete: number;
  status: string;
  pendingCount: number;
}

interface InstructorOverview {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  padiNumber: string | null;
  isActive: boolean;
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
  const [activeTab, setActiveTab] = useState<'dmts' | 'deleted' | 'instructors' | 'reports'>('dmts');

  // DMTs State
  const [candidates, setCandidates] = useState<CandidateOverview[]>([]);
  // Instructors State
  const [instructors, setInstructors] = useState<InstructorOverview[]>([]);
  // Reports / Audit State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Add Instructor Modal State
  const [showAddInstModal, setShowAddInstModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [padiNumber, setPadiNumber] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [isSubmittingInst, setIsSubmittingInst] = useState(false);
  const [instError, setInstError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [candRes, instRes, auditRes] = await Promise.all([
        fetch('/api/instructors/candidates'),
        fetch('/api/instructors'),
        fetch('/api/audit-logs'),
      ]);

      if (candRes.ok) {
        const body = await candRes.json();
        setCandidates(body.candidates || []);
      }

      if (instRes.ok) {
        const body = await instRes.json();
        setInstructors(body.instructors || []);
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

  const handleCreateInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !padiNumber) {
      setInstError('All fields including PADI Number are required for instructors.');
      return;
    }

    setIsSubmittingInst(true);
    setInstError(null);

    try {
      const res = await fetch('/api/instructors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          padiNumber,
          password,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setInstError(body.error?.message || 'Failed to create instructor');
        setIsSubmittingInst(false);
        return;
      }

      setShowAddInstModal(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPadiNumber('');
      setPassword('Password123!');
      loadAdminData();
    } catch {
      setInstError('Failed to create instructor');
    } finally {
      setIsSubmittingInst(false);
    }
  };

  const handleDeleteInstructor = async (instId: string) => {
    if (!confirm('Are you sure you want to deactivate this instructor?')) return;

    try {
      const res = await fetch(`/api/instructors/${instId}`, { method: 'DELETE' });
      if (res.ok) {
        loadAdminData();
      }
    } catch (err) {
      console.error('Failed to delete instructor:', err);
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

  const activeCandidates = candidates.filter((c) => c.isActive !== false);
  const deletedCandidates = candidates.filter((c) => c.isActive === false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-600 p-6 sm:p-8 rounded-2xl text-white shadow-lg shadow-sky-600/15">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Admin Management Panel</h1>
          <p className="text-sm text-sky-100 mt-1 font-medium">
            Manage DMT Candidates, Instructors, and System Reports
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
          DMT Candidates ({activeCandidates.length})
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
          Deleted DMTs ({deletedCandidates.length})
        </Button>
        <Button
          variant={activeTab === 'instructors' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('instructors')}
          className={
            activeTab === 'instructors'
              ? 'bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
          }
        >
          Instructors ({instructors.length})
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

      {/* TAB 1: Active DMTs Roster */}
      {activeTab === 'dmts' && (
        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Active DMT Candidates Roster</CardTitle>
            <CardDescription className="text-slate-500 text-sm">
              Manage active DMT candidates, inspect status reports, or move test candidates to the Deleted tab
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-slate-500 font-medium">Loading DMT candidates...</div>
            ) : activeCandidates.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-medium">No active DMT candidates found.</div>
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
                            COMPLETE
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

      {/* TAB 2: Deleted DMTs */}
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
              <div className="py-12 text-center text-slate-500 italic">No deleted DMT candidates in bin.</div>
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

      {/* TAB 3: Instructors Management */}
      {activeTab === 'instructors' && (
        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Staff Instructors</CardTitle>
              <CardDescription className="text-slate-500 text-sm">
                Add and manage authorized PADI instructors for evaluations and sign-offs
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAddInstModal(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs"
            >
              + Add New Instructor
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-slate-500 font-medium">Loading instructors...</div>
            ) : instructors.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-medium">No instructors found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="text-slate-700 font-bold">Instructor Name</TableHead>
                    <TableHead className="text-slate-700 font-bold">Email</TableHead>
                    <TableHead className="text-slate-700 font-bold">PADI Pro #</TableHead>
                    <TableHead className="text-slate-700 font-bold">Status</TableHead>
                    <TableHead className="text-right text-slate-700 font-bold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instructors.map((inst) => (
                    <TableRow key={inst.id} className="border-slate-200 hover:bg-sky-50/40 transition-colors">
                      <TableCell className="font-bold text-slate-800">
                        {inst.firstName} {inst.lastName}
                      </TableCell>
                      <TableCell className="text-slate-600">{inst.email}</TableCell>
                      <TableCell className="font-mono font-bold text-slate-700">
                        {inst.padiNumber || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {inst.isActive ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold">
                            ACTIVE STAFF
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-300 text-slate-500">
                            INACTIVE
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteInstructor(inst.id)}
                          className="border-red-200 text-red-700 hover:bg-red-50 font-medium"
                        >
                          Deactivate
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

      {/* Add New Instructor Modal */}
      <Dialog open={showAddInstModal} onOpenChange={setShowAddInstModal}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900">Add New Staff Instructor</DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              Create credentials for an authorized PADI Instructor to evaluate DMT candidates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInstructor} className="space-y-4 py-2">
            {instError && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 text-sm">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{instError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-slate-700 text-xs font-semibold">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-slate-700 text-xs font-semibold">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 text-xs font-semibold">Instructor Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border-slate-300 text-slate-900"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="padiNumber" className="text-slate-700 text-xs font-semibold">PADI Instructor Number (e.g. MSDT-123456) *</Label>
              <Input
                id="padiNumber"
                value={padiNumber}
                onChange={(e) => setPadiNumber(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700 text-xs font-semibold">Initial Password *</Label>
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 font-mono"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddInstModal(false)}
                className="border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingInst}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs"
              >
                {isSubmittingInst ? 'Creating Instructor...' : 'Create Instructor Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
