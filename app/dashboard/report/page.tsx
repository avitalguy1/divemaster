'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

export default function StudentReportPage() {
  const [user, setUser] = useState<any>(null);
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    async function loadReportData() {
      setIsLoading(true);
      try {
        const [meRes, courseMeRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/courses/me'),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        }

        if (courseMeRes.ok) {
          const courseData = await courseMeRes.json();
          setProgress(courseData.progress || null);
          setMentor(courseData.mentor || null);
        }
      } catch (err) {
        console.error('Failed to load student report:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReportData();
  }, []);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/courses/me/pdf');
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dmt-evaluation-report-${user?.firstName || 'candidate'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      window.open('/api/courses/me/pdf', '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const approved = progress?.approvedUnits || 0;
  const pending = progress?.pendingUnits || 0;
  const notStarted = progress?.notStartedUnits || 53;
  const percent = progress?.percentComplete || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-8 flex justify-center items-center">
        <div className="text-slate-500 font-medium">Loading evaluation report...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 space-y-6 max-w-5xl mx-auto pb-20 sm:pb-8">
      {/* Top Action Bar */}
      <div className="flex justify-end items-center">
        <Button
          disabled={isDownloading}
          onClick={handleDownloadPdf}
          className="bg-sky-600 hover:bg-sky-500 text-white font-bold h-11 px-5 shadow-md flex items-center gap-2"
        >
          <span>📄</span>
          <span>{isDownloading ? 'Generating PDF...' : 'Download PDF Report'}</span>
        </Button>
      </div>

      {/* Report Header Card */}
      <div className="bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-600 p-6 sm:p-8 rounded-2xl text-white shadow-lg shadow-sky-600/15 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Badge className="bg-white/20 text-white border-white/30 text-xs font-semibold mb-2">
              PADI Candidate Record
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-sm text-sky-100 font-medium mt-1">
              {user?.email} {user?.padiNumber ? `• PADI No. ${user.padiNumber}` : ''}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-right min-w-[160px]">
            <div className="text-xs text-sky-100 font-medium">Overall Course Completion</div>
            <div className="text-3xl font-black text-white mt-0.5">{percent}%</div>
            <div className="text-[11px] text-sky-200 mt-1 font-mono font-bold">{approved} of 53 Units Approved</div>
          </div>
        </div>

        {mentor && (
          <div className="pt-2 border-t border-white/15 flex items-center gap-2 text-xs text-sky-100 font-medium">
            <span>Assigned Mentor Instructor:</span>
            <span className="font-bold text-white">{mentor.firstName} {mentor.lastName} {mentor.padiNumber ? `(${mentor.padiNumber})` : ''}</span>
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium">Approved Sign-offs</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-emerald-600">{approved} / 53</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Progress value={percent} className="h-2 bg-slate-100" />
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium">Pending Review</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-amber-600">{pending}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500 font-medium">Awaiting Evaluation</span>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-medium">Remaining Items</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-600">{notStarted}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500 font-medium">Not Yet Requested</span>
          </CardContent>
        </Card>
      </div>

      {/* Section Progress Breakdown Table */}
      <Card className="border border-slate-200/80 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">Section Evaluation Roster</CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            Detailed breakdown of PADI requirements across all 9 evaluation modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="text-slate-700 font-bold">Code</TableHead>
                <TableHead className="text-slate-700 font-bold">Requirement Section</TableHead>
                <TableHead className="text-slate-700 font-bold text-center">Approved</TableHead>
                <TableHead className="text-slate-700 font-bold text-center">Pending</TableHead>
                <TableHead className="text-slate-700 font-bold text-center">Total Required</TableHead>
                <TableHead className="text-slate-700 font-bold text-right">Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progress?.sections.map((sec) => {
                const secPercent = sec.totalUnits > 0 ? Math.round((sec.approvedUnits / sec.totalUnits) * 100) : 0;
                return (
                  <TableRow key={sec.sectionId} className="border-slate-200 hover:bg-sky-50/40 transition-colors">
                    <TableCell className="font-mono font-bold text-sky-700">{sec.code}</TableCell>
                    <TableCell className="font-bold text-slate-800">{sec.title}</TableCell>
                    <TableCell className="text-center font-mono font-bold text-emerald-600">{sec.approvedUnits}</TableCell>
                    <TableCell className="text-center font-mono font-bold text-amber-600">{sec.pendingUnits}</TableCell>
                    <TableCell className="text-center font-mono font-bold text-slate-600">{sec.totalUnits}</TableCell>
                    <TableCell className="text-right w-36">
                      <div className="space-y-1">
                        <div className="text-xs text-slate-600 font-mono font-bold">{secPercent}%</div>
                        <Progress value={secPercent} className="h-1.5 bg-slate-100" />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
