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
  const [activeTab, setActiveTab] = useState<'dmts' | 'instructors' | 'reports'>('dmts');

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
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleAddInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !padiNumber) {
      setInstError('Please complete all required fields.');
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
        setInstError(body.error?.message || 'Failed to add instructor');
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
      setInstError('Failed to add instructor');
    } finally {
      setIsSubmittingInst(false);
    }
  };

  const handleDeleteInstructor = async (instId: string, instName: string) => {
    if (!confirm(`Are you sure you want to delete instructor ${instName}?`)) return;

    try {
      const res = await fetch(`/api/instructors/${instId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadAdminData();
      }
    } catch (err) {
      console.error('Failed to delete instructor:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Administrator Panel</h1>
          <p className="text-sm text-slate-400">
            Divemaster candidate tracking, instructor roster management, and audit reports
          </p>
        </div>
      </div>

      {/* Navigation Menu Tabs (DMTs | Instructors | Reports) */}
      <div className="flex border-b border-slate-800 gap-2 pb-1">
        <Button
          variant={activeTab === 'dmts' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('dmts')}
          className={
            activeTab === 'dmts'
              ? 'bg-blue-600 text-white font-bold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
          }
        >
          DMTs ({candidates.length})
        </Button>
        <Button
          variant={activeTab === 'instructors' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('instructors')}
          className={
            activeTab === 'instructors'
              ? 'bg-blue-600 text-white font-bold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
          }
        >
          Instructors ({instructors.length})
        </Button>
        <Button
          variant={activeTab === 'reports' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('reports')}
          className={
            activeTab === 'reports'
              ? 'bg-blue-600 text-white font-bold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
          }
        >
          Reports & Audit
        </Button>
      </div>

      {/* TAB 1: DMTs Roster */}
      {activeTab === 'dmts' && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">DMT Candidates Roster</CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              Click on any candidate to inspect their status report, completed tasks, and evaluation records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-slate-400">Loading DMT candidates...</div>
            ) : candidates.length === 0 ? (
              <div className="py-8 text-center text-slate-400">No DMT candidates found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-300">DMT Candidate</TableHead>
                    <TableHead className="text-slate-300">Training Status</TableHead>
                    <TableHead className="text-slate-300">Approved Units</TableHead>
                    <TableHead className="text-slate-300">Overall Progress</TableHead>
                    <TableHead className="text-right text-slate-300">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((cand) => (
                    <TableRow key={cand.studentId} className="border-slate-800 hover:bg-slate-950/80 transition-colors">
                      <TableCell className="font-semibold text-slate-100">
                        <Link href={`/admin/candidates/${cand.studentId}`} className="text-base text-blue-400 hover:underline">
                          {cand.studentName}
                        </Link>
                        <div className="text-xs text-slate-500 font-normal">{cand.email}</div>
                      </TableCell>

                      <TableCell>
                        {cand.status === 'COMPLETE' ? (
                          <Badge className="bg-green-600/20 text-green-300 border border-green-500/30">
                            COMPLETE
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-blue-500/40 text-blue-300">
                            IN TRAINING
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-slate-300">
                        {cand.approvedUnits} / 53
                      </TableCell>

                      <TableCell className="w-44">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-400 font-mono text-right">{cand.percentComplete}%</div>
                          <Progress value={cand.percentComplete} className="h-2 bg-slate-950" />
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <Link href={`/admin/candidates/${cand.studentId}`}>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                            View Status Report &rarr;
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: Instructors Directory with Add & Delete capabilities */}
      {activeTab === 'instructors' && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-lg font-bold text-white">Instructors Directory</CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                Active dive instructors available for mentoring and candidate evaluations
              </CardDescription>
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              onClick={() => {
                setShowAddInstModal(true);
                setInstError(null);
              }}
            >
              + Add New Instructor
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-slate-400">Loading instructors...</div>
            ) : instructors.length === 0 ? (
              <div className="py-8 text-center text-slate-400">No active instructors found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-300">Instructor Name</TableHead>
                    <TableHead className="text-slate-300">PADI #</TableHead>
                    <TableHead className="text-slate-300">Email Address</TableHead>
                    <TableHead className="text-right text-slate-300">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instructors.map((inst) => (
                    <TableRow key={inst.id} className="border-slate-800 hover:bg-slate-950/50">
                      <TableCell className="font-semibold text-slate-100">
                        {inst.firstName} {inst.lastName}
                      </TableCell>

                      <TableCell className="font-mono text-blue-400">
                        {inst.padiNumber || 'N/A'}
                      </TableCell>

                      <TableCell className="text-slate-300 text-xs">
                        {inst.email}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/50 text-xs"
                          onClick={() => handleDeleteInstructor(inst.id, `${inst.firstName} ${inst.lastName}`)}
                        >
                          Delete
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

      {/* TAB 3: Reports & System Audit Log */}
      {activeTab === 'reports' && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-lg font-bold text-white">System Reports & Audit Log</CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                Immutable record of all evaluations, approvals, rejections, and void interventions
              </CardDescription>
            </div>
            <Link href="/admin/audit">
              <Button size="sm" variant="outline" className="border-purple-800 text-purple-300 hover:bg-purple-950">
                Full Audit Log View &rarr;
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-slate-400">Loading audit records...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400">No system audit logs recorded yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-300">Timestamp</TableHead>
                    <TableHead className="text-slate-300">Actor</TableHead>
                    <TableHead className="text-slate-300">Action</TableHead>
                    <TableHead className="text-slate-300">Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.slice(0, 10).map((log) => (
                    <TableRow key={log.id} className="border-slate-800 hover:bg-slate-950/50 text-xs">
                      <TableCell className="font-mono text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium text-slate-200">
                        {log.actor.name} ({log.actor.role})
                      </TableCell>
                      <TableCell>
                        {log.action === 'APPROVE' ? (
                          <Badge className="bg-green-600/20 text-green-300 border border-green-500/30">APPROVE</Badge>
                        ) : log.action === 'REJECT' ? (
                          <Badge className="bg-red-600/20 text-red-300 border border-red-500/30">REJECT</Badge>
                        ) : (
                          <Badge className="bg-purple-600/20 text-purple-300 border border-purple-500/30">VOID</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-slate-400">{log.entity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Instructor Dialog */}
      <Dialog open={showAddInstModal} onOpenChange={setShowAddInstModal}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Add New Instructor</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Create an instructor account to authorize candidate sign-offs and mentoring
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddInstructor} className="space-y-4 py-2">
            {instError && (
              <Alert variant="destructive" className="border-red-900/50 bg-red-950/50 text-red-200 text-sm">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{instError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first-name" className="text-slate-200 text-sm">First Name *</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name" className="text-slate-200 text-sm">Last Name *</Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200 text-sm">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="instructor@example.com"
                className="bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="padi-num" className="text-slate-200 text-sm">PADI Pro Number *</Label>
              <Input
                id="padi-num"
                value={padiNumber}
                onChange={(e) => setPadiNumber(e.target.value)}
                placeholder="MSDT-123456"
                className="bg-slate-950 border-slate-800 text-slate-100 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pass" className="text-slate-200 text-sm">Default Password *</Label>
              <Input
                id="pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddInstModal(false)} className="border-slate-800 text-slate-300">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingInst}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                {isSubmittingInst ? 'Adding...' : 'Create Instructor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
