'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Instructor Dashboard</h1>
          <p className="text-sm text-slate-400">
            Active Divemaster candidates, pending sign-offs, and progress tracking
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/instructor/inbox">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
              Go to Full Inbox
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white">Active Candidates</CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Click on any candidate to view their evaluation page and approve pending requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">Loading candidate list...</div>
          ) : candidates.length === 0 ? (
            <div className="py-8 text-center text-slate-400">No active candidates found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-300">Candidate</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Pending Requests</TableHead>
                  <TableHead className="text-slate-300">Approved Units</TableHead>
                  <TableHead className="text-slate-300">Overall Progress</TableHead>
                  <TableHead className="text-right text-slate-300">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((cand) => (
                  <TableRow key={cand.studentId} className="border-slate-800 hover:bg-slate-950/80 transition-colors">
                    <TableCell className="font-semibold text-slate-100">
                      <Link href={`/instructor/candidates/${cand.studentId}`} className="text-base text-blue-400 hover:underline">
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

                    <TableCell>
                      {cand.pendingCount > 0 ? (
                        <Link href={`/instructor/candidates/${cand.studentId}`}>
                          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-1 font-semibold cursor-pointer hover:bg-amber-500/30">
                            {cand.pendingCount} Pending
                          </Badge>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-500 italic">None</span>
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
                      <Link href={`/instructor/candidates/${cand.studentId}`}>
                        <Button size="sm" variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-800">
                          Review Candidate
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
    </div>
  );
}
