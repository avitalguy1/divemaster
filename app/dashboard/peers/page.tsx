'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

interface Peer {
  studentId: string;
  studentName: string;
  email: string;
  country: string;
  approvedUnits: number;
  percentComplete: number;
  status: 'ACTIVE' | 'COMPLETE';
  isSelf: boolean;
}

export default function StudentPeersPage() {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadPeers() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/peers');
        if (res.ok) {
          const body = await res.json();
          setPeers(body.peers || []);
        }
      } catch (err) {
        console.error('Failed to load peers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPeers();
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const filteredPeers = peers.filter(
    (p) => !query || p.studentName.toLowerCase().includes(query)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto pb-24 sm:pb-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-600 p-6 sm:p-8 rounded-2xl text-white shadow-lg shadow-sky-600/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Badge className="bg-white/20 text-white border-white/30 text-xs font-semibold mb-2">
            Divemaster Class Roster
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">My DMT Peers</h1>
          <p className="text-sm text-sky-100 font-medium mt-1">
            Active Divemaster candidates, training status, overall progress, and approved units
          </p>
        </div>
        <Badge className="bg-white text-sky-800 border-white font-extrabold text-sm px-4 py-2 shadow-sm">
          {peers.length} Active Candidates
        </Badge>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <span className="text-slate-400 font-bold text-sm">🔍</span>
        <Input
          type="text"
          placeholder="Search peers by candidate name..."
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

      {/* Peers Table Card */}
      <Card className="border border-slate-200/80 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">DMT Class Roster</CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            Live progress records for all Divemaster Candidates in your class
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 font-medium">Loading DMT peer class roster...</div>
          ) : filteredPeers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">No candidates match your search filter.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-700 font-bold">Candidate Name</TableHead>
                  <TableHead className="text-slate-700 font-bold">Status</TableHead>
                  <TableHead className="text-slate-700 font-bold">Approved Units</TableHead>
                  <TableHead className="text-slate-700 font-bold w-48">Overall Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeers.map((peer) => (
                  <TableRow
                    key={peer.studentId}
                    className={`border-slate-200 transition-colors ${
                      peer.isSelf ? 'bg-sky-50/70 font-semibold' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <TableCell className="font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{peer.studentName}</span>
                        {peer.isSelf && (
                          <Badge className="bg-sky-600 text-white font-extrabold text-[10px] px-2 py-0.5">
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {peer.status === 'COMPLETE' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-xs">
                          GRADUATED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700 font-bold text-xs">
                          IN TRAINING
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="font-mono font-bold text-slate-800">
                      {peer.approvedUnits} / 53 Units
                    </TableCell>

                    <TableCell className="w-48">
                      <div className="space-y-1">
                        <div className="text-xs text-slate-700 font-mono font-bold text-right">
                          {peer.percentComplete}%
                        </div>
                        <Progress value={peer.percentComplete} className="h-2 bg-slate-100" />
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
