'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

interface CandidateReportRow {
  studentId: string;
  studentName: string;
  email: string;
  country: string;
  status: string;
  approvedUnits: number;
  percentComplete: number;
}

export default function ReportsPage() {
  const [candidates, setCandidates] = useState<CandidateReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/instructors/candidates');
      if (res.ok) {
        const body = await res.json();
        setCandidates(body.candidates || []);
      }
    } catch (err) {
      console.error('Failed to load candidate reports:', err);
    } fontally: () => {
      setIsLoading(false);
    };
  };

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/instructors/candidates');
        if (res.ok) {
          const body = await res.json();
          setCandidates(body.candidates || []);
        }
      } catch (err) {
        console.error('Failed to load candidate reports:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const filteredCandidates = candidates.filter(
    (c) =>
      !query ||
      c.studentName.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      (c.country && c.country.toLowerCase().includes(query))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto pb-20 sm:pb-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-600 p-6 sm:p-8 rounded-2xl text-white shadow-lg shadow-sky-600/15">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">DMT Master Evaluation Reports</h1>
          <p className="text-sm text-sky-100 mt-1 font-medium">
            Complete progress records, country origin, sign-off metrics, and master PDF export
          </p>
        </div>
        <div>
          <a href="/api/reports/dmts/pdf" download>
            <Button className="bg-white text-sky-800 hover:bg-sky-50 font-bold shadow-md flex items-center gap-2">
              <span>📄</span> Export All DMTs PDF
            </Button>
          </a>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <span className="text-slate-400 font-bold text-sm">🔍</span>
        <Input
          type="text"
          placeholder="Filter candidates by name, email, or country..."
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

      {/* Candidates Summary Table */}
      <Card className="border border-slate-200/80 bg-white shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">Master Candidate Summary Table</CardTitle>
            <CardDescription className="text-slate-500 text-sm">
              Overview of all DMT candidates sorted by course evaluation status
            </CardDescription>
          </div>
          <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-bold">
            Total Candidates: {filteredCandidates.length}
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 font-medium">Loading DMT reports...</div>
          ) : filteredCandidates.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">No DMT candidate records found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-700 font-bold">Name</TableHead>
                  <TableHead className="text-slate-700 font-bold">Country</TableHead>
                  <TableHead className="text-slate-700 font-bold">Status</TableHead>
                  <TableHead className="text-slate-700 font-bold">Approved Units</TableHead>
                  <TableHead className="text-slate-700 font-bold">Overall Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.map((cand) => (
                  <TableRow key={cand.studentId} className="border-slate-200 hover:bg-sky-50/40 transition-colors">
                    <TableCell className="font-bold text-slate-800">
                      <Link href={`/admin/candidates/${cand.studentId}`} className="text-base text-sky-700 hover:text-sky-800 hover:underline">
                        {cand.studentName}
                      </Link>
                      <div className="text-xs text-slate-500 font-normal">{cand.email}</div>
                    </TableCell>

                    <TableCell className="font-medium text-slate-700">
                      {cand.country || 'N/A'}
                    </TableCell>

                    <TableCell>
                      {cand.status === 'COMPLETE' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold">
                          GRADUATED
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
