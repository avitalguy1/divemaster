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

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [sectionItems, setSectionItems] = useState<CatalogSectionItems[]>([]);
  const [expandedSectionId, setExpandedSectionId] = useState<number | null>(null);
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
      const [meRes, instRes, courseMeRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/instructors'),
        fetch('/api/courses/me'),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
      }

      if (instRes.ok) {
        const instData = await instRes.json();
        setInstructors(instData.instructors || []);
      }

      if (courseMeRes.ok) {
        const courseData = await courseMeRes.json();
        setCourseId(courseData.courseId);
        setProgress(courseData.progress || null);
        setMentor(courseData.mentor || null);
        setSectionItems(courseData.sections || []);

        if (!courseData.mentor) {
          setShowMentorModal(true);
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
    return <div className="p-12 text-center text-slate-500 font-medium">Loading candidate progress dashboard...</div>;
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
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-600 p-6 sm:p-8 rounded-2xl text-white shadow-lg shadow-sky-600/15">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Welcome, {user?.firstName || 'DMT Candidate'}!
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <p className="text-sm text-sky-100 font-medium">
            PADI Divemaster Candidate Evaluation Record
          </p>
          {mentor ? (
            <Badge variant="outline" className="border-white/30 bg-white/15 text-white text-xs backdrop-blur-xs">
              Mentor: {mentor.firstName} {mentor.lastName} {mentor.padiNumber ? `(${mentor.padiNumber})` : ''}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-300/60 bg-amber-500/20 text-amber-100 text-xs cursor-pointer hover:bg-amber-500/30" onClick={() => setShowMentorModal(true)}>
              + Select Mentor Instructor
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium">Total Progress</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-sky-700">{percent}%</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Progress value={percent} className="h-2 bg-slate-100" />
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium">Approved Units</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-emerald-600">{approved} / 53</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500">PADI Standards Satisfied</span>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium">Waiting Review</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-amber-600">{pending}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500">Instructor Review Pending</span>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-shadow">
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
              Click any section below to expand requirement items and request sign-offs
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
                    <div className="border-t border-slate-200 bg-white p-3 space-y-2">
                      {!secData || !secData.items || secData.items.length === 0 ? (
                        <div className="text-xs text-slate-500 italic py-2 text-center">No requirement items in this section.</div>
                      ) : (
                        secData.items.map((item) => (
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

                              {item.status !== 'APPROVED' && (
                                <Link href={`/dashboard/requests/new?itemId=${item.id}`}>
                                  <Button size="sm" variant="outline" className="h-7 text-[11px] border-sky-300 text-sky-700 hover:bg-sky-50 font-semibold">
                                    + Request Sign-off
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Mentor Selection Modal */}
      <Dialog open={showMentorModal} onOpenChange={setShowMentorModal}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900">Select Your Mentor Instructor</DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              Every PADI Divemaster candidate is assigned a Mentor Instructor responsible for reviewing prerequisites and evaluating overall course progress.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {mentorError && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 text-sm">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{mentorError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="mentor-select" className="text-slate-700 text-sm font-semibold">
                Mentor Instructor *
              </Label>
              <Select value={selectedMentorId} onValueChange={(val) => setSelectedMentorId(val || '')}>
                <SelectTrigger id="mentor-select" className="bg-white border-slate-300 text-slate-800 h-11 w-full">
                  <SelectValue placeholder="Select your mentor instructor...">
                    {selectedInstLabel || undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800">
                  {instructors.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id} className="focus:bg-slate-100 text-sm">
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
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold h-11 shadow-sm"
            >
              {isAssigningMentor ? 'Assigning Mentor...' : 'Confirm Mentor Selection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
