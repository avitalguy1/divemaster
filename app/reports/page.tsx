'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CandidateReportRow {
  studentId: string;
  studentName: string;
  email: string;
  country: string;
  status: string;
  approvedUnits: number;
  percentComplete: number;
}

interface SkillItem {
  id: number;
  sectionId: number;
  sectionCode: string;
  sectionTitle: string;
  code: string;
  title: string;
  scoring: string;
  requiredCount: number;
}

interface GapCandidate {
  studentId: string;
  studentName: string;
  email: string;
  country: string;
  courseId: string;
  percentComplete: number;
  approvedUnits: number;
  startedItemIds: number[];
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'summary' | 'skill-gap'>('summary');
  const [candidates, setCandidates] = useState<CandidateReportRow[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Skill Gap Report State
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [gapCandidates, setGapCandidates] = useState<GapCandidate[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [isLoadingSkillGap, setIsLoadingSkillGap] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoadingSummary(true);
      try {
        const [candRes, gapRes] = await Promise.all([
          fetch('/api/instructors/candidates'),
          fetch('/api/reports/skill-gap'),
        ]);

        if (candRes.ok) {
          const body = await candRes.json();
          setCandidates(body.candidates || []);
        }

        if (gapRes.ok) {
          const gapBody = await gapRes.json();
          const fetchedSkills: SkillItem[] = gapBody.skills || [];
          setSkills(fetchedSkills);
          setGapCandidates(gapBody.candidates || []);
          if (fetchedSkills.length > 0 && !selectedSkillId) {
            setSelectedSkillId(fetchedSkills[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setIsLoadingSummary(false);
      }
    }
    loadData();
  }, []);

  // Filter candidates for summary report
  const query = searchQuery.trim().toLowerCase();
  const filteredSummaryCandidates = candidates.filter(
    (c) =>
      !query ||
      c.studentName.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      (c.country && c.country.toLowerCase().includes(query))
  );

  // Selected skill item for Skill Gap report
  const currentSelectedSkill = skills.find((s) => s.id === selectedSkillId);

  // Candidates who HAVE NOT STARTED the selected skill
  const unstartedCandidatesForSkill = selectedSkillId
    ? gapCandidates.filter((c) => !c.startedItemIds.includes(selectedSkillId))
    : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto pb-20 sm:pb-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-600 p-6 sm:p-8 rounded-2xl text-white shadow-lg shadow-sky-600/15">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">DMT Master Evaluation Reports</h1>
          <p className="text-sm text-sky-100 mt-1 font-medium">
            Master roster records, skill gap analysis, and PDF export reports
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <a href="/api/reports/dmts/pdf" download>
            <Button className="bg-white text-sky-800 hover:bg-sky-50 font-bold shadow-md flex items-center gap-2">
              <span>📄</span> Export All DMTs PDF
            </Button>
          </a>
          {selectedSkillId && (
            <a href={`/api/reports/skill-gap/pdf?itemId=${selectedSkillId}`} download>
              <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 font-bold flex items-center gap-2">
                <span>🎯</span> Export Skill Gap PDF
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Report View Toggle Navigation */}
      <div className="flex border-b border-slate-200 pb-3 gap-2">
        <Button
          variant={activeTab === 'summary' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('summary')}
          className={
            activeTab === 'summary'
              ? 'bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
          }
        >
          Master Candidates Summary
        </Button>
        <Button
          variant={activeTab === 'skill-gap' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('skill-gap')}
          className={
            activeTab === 'skill-gap'
              ? 'bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
          }
        >
          🎯 DMT Skill Gap Report
        </Button>
      </div>

      {/* REPORT VIEW 1: Master Candidates Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
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

          <Card className="border border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Master Candidate Summary Table</CardTitle>
                <CardDescription className="text-slate-500 text-sm">
                  Overview of all DMT candidates sorted by course evaluation status
                </CardDescription>
              </div>
              <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-bold">
                Total Candidates: {filteredSummaryCandidates.length}
              </Badge>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <div className="py-12 text-center text-slate-500 font-medium">Loading DMT reports...</div>
              ) : filteredSummaryCandidates.length === 0 ? (
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
                    {filteredSummaryCandidates.map((cand) => (
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
      )}

      {/* REPORT VIEW 2: DMT Skill Gap Report */}
      {activeTab === 'skill-gap' && (
        <div className="space-y-6">
          <Card className="border border-slate-200/80 bg-white shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">DMT Skill Gap Analysis</CardTitle>
              <CardDescription className="text-slate-500 text-sm">
                Select any PADI requirement task to identify all candidates who have NOT yet started or requested sign-off for that skill.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Skill Selector Dropdown */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <Label htmlFor="skillSelect" className="text-slate-800 font-bold text-sm block">
                  Select PADI Requirement Task / Skill *
                </Label>
                <select
                  id="skillSelect"
                  value={selectedSkillId || ''}
                  onChange={(e) => setSelectedSkillId(Number(e.target.value))}
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      [{skill.sectionCode}] {skill.title} (Required: {skill.requiredCount})
                    </option>
                  ))}
                </select>
                {currentSelectedSkill && (
                  <p className="text-xs text-slate-600 pt-1 font-medium">
                    Catalog Section: <span className="font-bold text-sky-700">{currentSelectedSkill.sectionTitle}</span> • Requirement ID: #{currentSelectedSkill.id}
                  </p>
                )}
              </div>

              {/* Unstarted Candidates Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-base">
                    Candidates Pending Start for &quot;{currentSelectedSkill?.title}&quot;
                  </h3>
                  <Badge className="bg-red-50 text-red-700 border border-red-200 font-bold px-3 py-1">
                    {unstartedCandidatesForSkill.length} DMTs Not Started
                  </Badge>
                </div>

                {unstartedCandidatesForSkill.length === 0 ? (
                  <div className="p-8 text-center text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 font-bold">
                    ✓ Outstanding achievement! All active DMT candidates have started or completed this skill requirement.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 hover:bg-transparent">
                        <TableHead className="text-slate-700 font-bold">DMT Candidate</TableHead>
                        <TableHead className="text-slate-700 font-bold">Email</TableHead>
                        <TableHead className="text-slate-700 font-bold">Country</TableHead>
                        <TableHead className="text-slate-700 font-bold">Overall Progress</TableHead>
                        <TableHead className="text-right text-slate-700 font-bold">Skill Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unstartedCandidatesForSkill.map((cand) => (
                        <TableRow key={cand.studentId} className="border-slate-200 hover:bg-red-50/30 transition-colors">
                          <TableCell className="font-bold text-slate-800">
                            <Link href={`/admin/candidates/${cand.studentId}`} className="text-base text-sky-700 hover:text-sky-800 hover:underline">
                              {cand.studentName}
                            </Link>
                          </TableCell>

                          <TableCell className="text-slate-600 font-normal">
                            {cand.email}
                          </TableCell>

                          <TableCell className="font-medium text-slate-700">
                            {cand.country || 'N/A'}
                          </TableCell>

                          <TableCell className="w-44">
                            <div className="space-y-1">
                              <div className="text-xs text-slate-600 font-mono font-bold text-right">{cand.percentComplete}%</div>
                              <Progress value={cand.percentComplete} className="h-2 bg-slate-100" />
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 font-bold text-xs">
                              NOT STARTED
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
