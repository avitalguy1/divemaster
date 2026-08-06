'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProgressPie } from '@/components/charts/progress-pie';

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

interface Mentor {
  id: string;
  firstName: string;
  lastName: string;
  padiNumber: string | null;
}

interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  padiNumber: string | null;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [instructors, setInstructors] = useState<Instructor[]>([]);

  // Mentor Selection Modal State
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [isAssigningMentor, setIsAssigningMentor] = useState(false);
  const [mentorError, setMentorError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
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
        const instData = await instRes.json();
        setInstructors(instData.instructors || []);
      }

      const requestsRes = await fetch('/api/requests?mine=true');
      if (requestsRes.ok) {
        const reqData = await requestsRes.json();
        const firstReq = reqData.requests[0];
        if (firstReq?.request?.courseId) {
          const cId = firstReq.request.courseId;
          setCourseId(cId);

          const progRes = await fetch(`/api/courses/${cId}/progress`);
          if (progRes.ok) {
            const progData = await progRes.json();
            setProgress(progData.progress);
            setMentor(progData.mentor || null);

            // Prompt if no mentor assigned yet
            if (!progData.mentor) {
              setShowMentorModal(true);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleAssignMentor = async () => {
    if (!selectedMentorId) {
      setMentorError('Please select an instructor to be your mentor.');
      return;
    }

    setIsAssigningMentor(true);
    setMentorError(null);

    try {
      const res = await fetch('/api/courses/assign-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructorId: selectedMentorId }),
      });

      const body = await res.json();
      if (!res.ok) {
        setMentorError(body.error?.message || 'Failed to assign mentor');
        setIsAssigningMentor(false);
        return;
      }

      setShowMentorModal(false);
      loadDashboard();
    } catch {
      setMentorError('Failed to assign mentor');
    } finally {
      setIsAssigningMentor(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading student progress...</div>;
  }

  const approved = progress?.approvedUnits || 0;
  const pending = progress?.pendingUnits || 0;
  const notStarted = progress?.notStartedUnits || 53;
  const percent = progress?.percentComplete || 0;

  const selectedInst = instructors.find((i) => i.id === selectedMentorId);
  const selectedInstLabel = selectedInst
    ? `${selectedInst.firstName} ${selectedInst.lastName}`
    : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 p-6 rounded-xl border border-blue-900/40 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome, {user?.firstName || 'Candidate'}!
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-slate-400">
              PADI Divemaster Evaluation Progress
            </p>
            {mentor ? (
              <Badge variant="outline" className="border-blue-500/40 bg-blue-950/60 text-blue-300 text-xs">
                Mentor: {mentor.firstName} {mentor.lastName} {mentor.padiNumber ? `(${mentor.padiNumber})` : ''}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/50 bg-amber-950/40 text-amber-300 text-xs cursor-pointer" onClick={() => setShowMentorModal(true)}>
                + Assign Mentor
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link href="/dashboard/requests/new" className="w-full sm:w-auto">
            <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold">
              + New Request
            </Button>
          </Link>
          <Link href="/dashboard/requests" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full border-slate-800 text-slate-300">
              My Requests
            </Button>
          </Link>
          <Link href="/dashboard/requirements" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full border-slate-800 text-slate-300">
              View Catalog
            </Button>
          </Link>
          {courseId && (
            <a href={`/api/courses/${courseId}/pdf`} download className="w-full sm:w-auto">
              <Button variant="outline" className="w-full border-slate-800 text-slate-300">
                Export PDF
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* KPI Cards */}
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
            <span className="text-xs text-slate-400">Instructor Review Pending</span>
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

      {/* First Login Mentor Selection Dialog */}
      <Dialog open={showMentorModal} onOpenChange={setShowMentorModal}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Select Your Mentor Instructor</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Every PADI Divemaster candidate is assigned a Mentor Instructor responsible for reviewing prerequisites, administration, and overall progress.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {mentorError && (
              <Alert variant="destructive" className="border-red-900/50 bg-red-950/50 text-red-200 text-sm">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{mentorError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="mentor-select" className="text-slate-200 text-sm font-medium">
                Mentor Instructor *
              </Label>
              <Select value={selectedMentorId} onValueChange={(val) => setSelectedMentorId(val || '')}>
                <SelectTrigger id="mentor-select" className="bg-slate-950 border-slate-800 text-slate-100 h-11 w-full">
                  <SelectValue placeholder="Select your mentor instructor...">
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
          </div>

          <DialogFooter>
            <Button
              disabled={isAssigningMentor || !selectedMentorId}
              onClick={handleAssignMentor}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11"
            >
              {isAssigningMentor ? 'Assigning Mentor...' : 'Confirm Mentor Selection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
