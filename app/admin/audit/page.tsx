'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  before: any;
  after: any;
  createdAt: string;
  actor: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await fetch('/api/audit-logs');
        if (res.ok) {
          const body = await res.json();
          setLogs(body.logs || []);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white">System Audit Log</h1>
          <p className="text-sm text-slate-400">
            Immutable historic record of all sign-off approvals, rejections, and administrative voids
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline" className="border-slate-800 text-slate-300">
            Back to Admin Panel
          </Button>
        </Link>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white">Audit Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">Loading audit history...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-slate-400">No audit log entries recorded yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-300">Timestamp</TableHead>
                  <TableHead className="text-slate-300">Actor</TableHead>
                  <TableHead className="text-slate-300">Action</TableHead>
                  <TableHead className="text-slate-300">Entity ID</TableHead>
                  <TableHead className="text-slate-300">Changes / Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-slate-800 hover:bg-slate-950/50">
                    <TableCell className="text-xs font-mono text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-200">
                      {log.actor.firstName} {log.actor.lastName} ({log.actor.role})
                    </TableCell>
                    <TableCell>
                      {log.action === 'APPROVE' ? (
                        <Badge className="bg-green-600/20 text-green-300 border border-green-500/30 text-xs">
                          APPROVE
                        </Badge>
                      ) : log.action === 'REJECT' ? (
                        <Badge className="bg-red-600/20 text-red-300 border border-red-500/30 text-xs">
                          REJECT
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs">
                          VOID
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-400 truncate max-w-[120px]">
                      {log.entityId}
                    </TableCell>
                    <TableCell className="text-xs text-slate-300 max-w-xs font-mono">
                      {JSON.stringify(log.after)}
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
