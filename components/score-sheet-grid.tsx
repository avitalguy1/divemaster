'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface ScoreSheetLine {
  id: number;
  lineNumber: number;
  label: string;
  isUnderwater?: boolean;
}

interface ScoreSheetGridProps {
  lines: ScoreSheetLine[];
  onChange: (lineScores: { lineId: number; score: number }[]) => void;
}

export function ScoreSheetGrid({ lines, onChange }: ScoreSheetGridProps) {
  const [scores, setScores] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    lines.forEach((l) => {
      initial[l.id] = 4; // Default score 4
    });
    return initial;
  });

  useEffect(() => {
    const formatted = Object.entries(scores).map(([lineId, score]) => ({
      lineId: Number(lineId),
      score,
    }));
    onChange(formatted);
  }, [scores, onChange]);

  const handleScoreChange = (lineId: number, score: number) => {
    setScores((prev) => ({
      ...prev,
      [lineId]: score,
    }));
  };

  // Calculate live statistics
  const skills1To23Lines = lines.filter((l) => l.lineNumber >= 1 && l.lineNumber <= 23);
  const totalSkills1To23 = skills1To23Lines.reduce((sum, l) => sum + (scores[l.id] || 0), 0);

  const lowScoreLines = lines.filter((l) => (scores[l.id] || 0) < 3);

  const underwaterLineNumbers = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 22, 23];
  const hasUnderwater5 = lines.some(
    (l) => underwaterLineNumbers.includes(l.lineNumber) && scores[l.id] === 5
  );

  return (
    <div className="space-y-4 w-full">
      {/* Live Warning Cards */}
      <div className="grid gap-2">
        {totalSkills1To23 < 82 && (
          <Alert variant="destructive" className="border-amber-900/60 bg-amber-950/40 text-amber-200 text-xs">
            <AlertTitle className="font-semibold text-amber-300">Total Below Minimum</AlertTitle>
            <AlertDescription>
              Current skills 1–23 total is <strong className="text-white">{totalSkills1To23}</strong> (minimum 82 required to pass).
            </AlertDescription>
          </Alert>
        )}

        {lowScoreLines.length > 0 && (
          <Alert variant="destructive" className="border-red-900/60 bg-red-950/40 text-red-200 text-xs">
            <AlertTitle className="font-semibold text-red-300">Sub-threshold Skills Found</AlertTitle>
            <AlertDescription>
              {lowScoreLines.map((l) => `#${l.lineNumber}`).join(', ')} scored below 3. Every skill must score ≥ 3.
            </AlertDescription>
          </Alert>
        )}

        {!hasUnderwater5 && lines.length === 24 && (
          <Alert variant="destructive" className="border-amber-900/60 bg-amber-950/40 text-amber-200 text-xs">
            <AlertTitle className="font-semibold text-amber-300">Underwater 5 Score Required</AlertTitle>
            <AlertDescription>
              At least one underwater skill (skills 7–18, 22, 23) must achieve a score of 5.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Header bar with live total */}
      <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
        <span className="font-medium text-slate-300">Skills 1–23 Total:</span>
        <span
          className={`text-base font-bold ${
            totalSkills1To23 >= 82 ? 'text-green-400' : 'text-amber-400'
          }`}
        >
          {totalSkills1To23} / 115 (Min 82)
        </span>
      </div>

      {/* Grid of skill lines */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {lines.map((line) => {
          const isUw = line.isUnderwater || underwaterLineNumbers.includes(line.lineNumber);
          const currentScore = scores[line.id] || 4;

          return (
            <div
              key={line.id}
              className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2"
            >
              <div className="flex justify-between items-start text-xs">
                <div className="font-semibold text-slate-100 flex items-center gap-2">
                  <span className="text-blue-400 font-mono text-xs">#{line.lineNumber}</span>
                  <span>{line.label}</span>
                </div>
                {isUw && (
                  <Badge variant="outline" className="text-[10px] border-cyan-800 bg-cyan-950/50 text-cyan-300">
                    Underwater
                  </Badge>
                )}
              </div>

              {/* 1 to 5 Selector */}
              <div className="flex gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <Button
                    key={val}
                    type="button"
                    variant={currentScore === val ? 'default' : 'outline'}
                    size="sm"
                    className={
                      currentScore === val
                        ? val < 3
                          ? 'bg-red-600 text-white font-bold flex-1 h-9'
                          : val === 5
                          ? 'bg-green-600 text-white font-bold flex-1 h-9'
                          : 'bg-blue-600 text-white font-bold flex-1 h-9'
                        : 'border-slate-800 text-slate-300 hover:bg-slate-800 flex-1 h-9'
                    }
                    onClick={() => handleScoreChange(line.id, val)}
                  >
                    {val}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
