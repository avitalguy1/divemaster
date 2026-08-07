'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface InstructorOverview {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  padiNumber: string | null;
  isActive: boolean;
}

export default function InstructorsPage() {
  const [user, setUser] = useState<any>(null);
  const [instructors, setInstructors] = useState<InstructorOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Instructor Modal State
  const [showAddInstModal, setShowAddInstModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [padiNumber, setPadiNumber] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [isSubmittingInst, setIsSubmittingInst] = useState(false);
  const [instError, setInstError] = useState<string | null>(null);

  // Reset Password Modal State
  const [activeResetUser, setActiveResetUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('Password123!');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [meRes, instRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/instructors'),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
      }

      if (instRes.ok) {
        const body = await instRes.json();
        setInstructors(body.instructors || []);
      }
    } catch (err) {
      console.error('Failed to load instructor list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
          role: makeAdmin ? 'ADMIN' : 'INSTRUCTOR',
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
      setMakeAdmin(false);
      loadData();
    } catch {
      setInstError('Failed to create instructor');
    } finally {
      setIsSubmittingInst(false);
    }
  };

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

  const handleDeleteInstructor = async (instId: string) => {
    if (!confirm('Are you sure you want to deactivate this instructor?')) return;

    try {
      const res = await fetch(`/api/instructors/${instId}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to delete instructor:', err);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:pl-64">
      <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto pb-20 sm:pb-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-600 p-6 sm:p-8 rounded-2xl text-white shadow-lg shadow-sky-600/15">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Staff Instructors Directory</h1>
          <p className="text-sm text-sky-100 mt-1 font-medium">
            Authorized PADI Instructors and Staff Roster
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowAddInstModal(true)}
            className="bg-white text-sky-800 hover:bg-sky-50 font-bold shadow-sm"
          >
            + Add New Instructor
          </Button>
        )}
      </div>

      {/* Instructors Table Card */}
      <Card className="border border-slate-200/80 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">PADI Instructor Roster</CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            Active teaching staff, evaluation sign-off instructors, and administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 font-medium">Loading instructor roster...</div>
          ) : instructors.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">No instructors found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-700 font-bold">Instructor Name</TableHead>
                  <TableHead className="text-slate-700 font-bold">Email</TableHead>
                  <TableHead className="text-slate-700 font-bold">PADI Pro #</TableHead>
                  <TableHead className="text-slate-700 font-bold">Role & Status</TableHead>
                  {isAdmin && <TableHead className="text-right text-slate-700 font-bold">Actions</TableHead>}
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
                      <div className="flex items-center gap-1.5">
                        {inst.role === 'ADMIN' ? (
                          <Badge className="bg-purple-100 text-purple-800 border border-purple-300 font-bold">
                            ADMINISTRATOR
                          </Badge>
                        ) : (
                          <Badge className="bg-sky-50 text-sky-700 border border-sky-300 font-semibold">
                            INSTRUCTOR
                          </Badge>
                        )}
                        {inst.isActive ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold">
                            ACTIVE
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-300 text-slate-500">
                            INACTIVE
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveResetUser({ id: inst.id, name: `${inst.firstName} ${inst.lastName}`, email: inst.email });
                              setResetError(null);
                            }}
                            className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs"
                          >
                            Reset Password
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteInstructor(inst.id)}
                            className="border-red-200 text-red-700 hover:bg-red-50 font-medium text-xs"
                          >
                            Deactivate
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add New Instructor Modal */}
      <Dialog open={showAddInstModal} onOpenChange={setShowAddInstModal}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900">Add New Staff Member</DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              Create credentials for an authorized PADI Instructor or Administrator.
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
              <Label htmlFor="email" className="text-slate-700 text-xs font-semibold">Staff Email *</Label>
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

            {/* Toggle Button for Admin Privileges */}
            <div className="flex items-center justify-between p-3 bg-purple-50/80 border border-purple-200 rounded-xl mt-2">
              <div className="space-y-0.5 pr-2">
                <Label htmlFor="makeAdminToggle" className="text-xs font-bold text-purple-900 cursor-pointer block">
                  Grant Administrator Privileges (Role: ADMIN)
                </Label>
                <p className="text-[11px] text-purple-700 leading-tight">
                  Allows user to access admin management, add staff, reset passwords, and restore deleted DMTs
                </p>
              </div>
              <input
                id="makeAdminToggle"
                type="checkbox"
                checked={makeAdmin}
                onChange={(e) => setMakeAdmin(e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
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
                {isSubmittingInst ? 'Creating Staff Account...' : 'Create Staff Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={!!activeResetUser} onOpenChange={(open) => !open && setActiveResetUser(null)}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900">Reset Staff Password</DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              Enter a new password for staff instructor {activeResetUser?.name}.
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
              <Label className="text-slate-700 text-xs font-semibold">Instructor Account</Label>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-sm font-bold text-slate-800">
                {activeResetUser?.name} ({activeResetUser?.email})
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password-inst-page" className="text-slate-700 text-xs font-semibold">New Password *</Label>
              <Input
                id="new-password-inst-page"
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
