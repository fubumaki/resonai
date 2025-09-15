'use client';

import { useMemo, useState } from 'react';
import { PROSODY_PROMPTS } from '@/data/prosodyPrompts';
import { ProsodyDrill, ProsodyDrillResult } from '@/components/drills/ProsodyDrill';
import { track, ProsodyResult } from '@/engine/metrics/events';

type StepState =
  | { phase: 'idle' }
  | { phase: 'statement' }
  | { phase: 'question' }
  | { phase: 'done'; results: ProsodyDrillResult[]; passCount: number };

export function ProsodyPracticeCard({
  promptId = 'ready',
  onComplete
}: {
  /** Choose from PROSODY_PROMPTS; rotate externally if desired */
  promptId?: string;
  /** Called with results when both drills finish */
  onComplete: (results: ProsodyDrillResult[]) => void;
}) {
  const prompt = useMemo(
    () => PROSODY_PROMPTS.find(p => p.id === promptId) ?? PROSODY_PROMPTS[0],
    [promptId]
  );

  const [state, setState] = useState<StepState>({ phase: 'idle' });
  const [results, setResults] = useState<ProsodyDrillResult[]>([]);

  function start() {
    setResults([]);
    setState({ phase: 'statement' });
    track({ type: 'prosody_start', promptId: prompt.id, mode: 'statement' });
  }

  function handleResult(r: ProsodyDrillResult) {
    const next = [...results, r];
    setResults(next);

    if (r.mode === 'statement') {
      setState({ phase: 'question' });
      track({ type: 'prosody_start', promptId: prompt.id, mode: 'question' });
      return;
    }

    // Both finished
    const passCount = next.filter(x => x.pass).length;
    setState({ phase: 'done', results: next, passCount });
    onComplete(next);
    // Log both results
    for (const rr of next) {
      track({
        type: 'prosody_result',
        promptId: prompt.id,
        mode: rr.mode,
        label: rr.label,
        pass: rr.pass,
        slopeCentsPerSec: rr.slopeCentsPerSec,
        expressiveness01: rr.expressiveness01,
        voicedMs: rr.voicedMs
      } as Omit<ProsodyResult, 'ts' | 'build'>);
    }
  }

  return (
    <section
      role="region"
      aria-label="Prosody practice"
      className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
      data-testid="prosody-practice-card"
    >
      <header className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Prosody Practice</h3>
        <p className="text-sm text-gray-600 mt-1">
          Aim for a gentle fall on statements and a gentle rise on questions. Speak comfortably.
        </p>
      </header>

      {state.phase === 'idle' && (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Prompt</h4>
            <div className="space-y-2 text-sm">
              <div><strong>Statement:</strong> {prompt.statement}</div>
              <div><strong>Question:</strong> {prompt.question}</div>
            </div>
          </div>
          <div>
            <button 
              onClick={start}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Start (~ 2.5s each)
            </button>
          </div>
        </div>
      )}

      {state.phase === 'statement' && (
        <ProsodyDrill
          text={prompt.statement}
          mode="statement"
          promptId={prompt.id}
          onComplete={handleResult}
        />
      )}

      {state.phase === 'question' && (
        <ProsodyDrill
          text={prompt.question}
          mode="question"
          promptId={prompt.id}
          onComplete={handleResult}
        />
      )}

      {state.phase === 'done' && (
        <ResultsPane results={state.results} passCount={state.passCount} onRetry={() => setState({ phase: 'idle' })} />
      )}
    </section>
  );
}

function ResultsPane({
  results,
  passCount,
  onRetry
}: {
  results: ProsodyDrillResult[];
  passCount: number;
  onRetry: () => void;
}) {
  const status = passCount === 2 ? 'Great! Both contours detected.' :
                 passCount === 1 ? 'Nice! 1 of 2 detected - try once more.' :
                 'Let&apos;s try again with gentler contours.';

  // Generate coaching tips for failed attempts
  const getCoachingTip = (result: ProsodyDrillResult): string => {
    if (result.pass) return '';
    
    if (result.mode === 'statement' && result.label !== 'falling') {
      return 'Let the last word gently descend.';
    }
    if (result.mode === 'question' && result.label !== 'rising') {
      return 'Float the last syllable slightly higher.';
    }
    return 'Try a softer contour at the very end.';
  };
                 
  return (
    <div data-testid="prosody-results" className="space-y-4">
      <div 
        className="text-lg font-semibold text-gray-900"
        aria-live="polite"
        aria-label={`Prosody practice results: ${status}`}
      >
        {status}
      </div>
      <ul className="space-y-3 text-sm">
        {results.map((r, i) => {
          const tip = getCoachingTip(r);
          return (
            <li key={i} className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  {r.mode === 'statement' ? 'Statement' : 'Question'} →
                </span>
                <span className={`font-bold ${r.pass ? 'text-green-600' : 'text-red-600'}`}>
                  {r.label.toUpperCase()}
                </span>
                <span className="text-gray-500">
                  slope ~ {r.slopeCentsPerSec.toFixed(0)} c/s
                </span>
                <span className="text-gray-500">
                  voiced {r.voicedMs.toFixed(0)}ms
                </span>
                <span className="text-gray-500">
                  expressiveness {(r.expressiveness01 * 100).toFixed(0)}%
                </span>
                <span className={r.pass ? 'text-green-600' : 'text-red-600'}>
                  {r.pass ? '✓' : '✗'}
                </span>
              </div>
              {tip && (
                <div className="text-xs text-blue-600 italic ml-4">
                  💡 {tip}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex space-x-2">
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
