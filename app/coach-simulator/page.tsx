// src/app/coach-simulator/page.tsx
// Policy simulator page for testing coach behavior with sliders

'use client';

import { useState, useEffect } from 'react';
import { CoachPolicyV2, CoachHint } from '@/coach/policyDefault';
import { MetricSnapshot } from '@/coach/types';
import { CoachDisplay } from '@/coach/CoachDisplay';

export default function CoachSimulatorPage() {
  const [policy] = useState(() => new CoachPolicyV2());
  const [metrics, setMetrics] = useState({
    jitterEma: 0.2,
    loudNorm: 0.3,
    timeInTargetPct: 0.8,
    confidence: 0.7
  });
  const [dtwTier, setDtwTier] = useState<number | undefined>(undefined);
  const [endRiseDetected, setEndRiseDetected] = useState<boolean | undefined>(undefined);
  const [lastHint, setLastHint] = useState<CoachHint | null>(null);
  const [hintHistory, setHintHistory] = useState<Array<{ type: string; hint: CoachHint; time: number }>>([]);
  const [isRealtimeMode, setIsRealtimeMode] = useState(true);

  // Generate snapshots based on current metrics
  const generateSnapshots = (): MetricSnapshot[] => {
    const snapshots: MetricSnapshot[] = [];
    const now = Date.now();
    
    // Generate 500 snapshots (5 seconds worth)
    for (let i = 0; i < 500; i++) {
      snapshots.push({
        t: now - (500 - i) * 10, // 10ms intervals
        jitterEma: metrics.jitterEma,
        loudNorm: metrics.loudNorm,
        timeInTarget: metrics.timeInTargetPct > 0.5,
        confidence: metrics.confidence
      });
    }
    
    return snapshots;
  };

  // Test realtime hints
  const testRealtime = () => {
    policy.startStep();
    const snapshots = generateSnapshots();
    const hints = policy.realtime(snapshots);
    
    if (hints.length > 0) {
      setLastHint(hints[0]);
      setHintHistory(prev => [...prev, { type: 'realtime', hint: hints[0], time: Date.now() }]);
    }
  };

  // Test post-utterance hints
  const testPost = () => {
    const result = policy.postPhrase({
      dtwTier: dtwTier as 1|2|3|4|5|undefined,
      endRiseDetected
    });
    
    if (result.length > 0) {
      setLastHint(result[0]);
      setHintHistory(prev => [...prev, { type: 'post', hint: result[0], time: Date.now() }]);
    }
  };

  // Auto-test when metrics change
  useEffect(() => {
    if (isRealtimeMode) {
      testRealtime();
    }
  }, [metrics, isRealtimeMode]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Coach Policy Simulator
          </h1>
          <p className="text-gray-600 mb-4">
            Drag the sliders to test different metric combinations and see which hints the coach would generate.
            Add <code>?coachhud=1</code> to the URL to see the debug HUD.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Metric Controls</h2>
            
            {/* Mode Toggle */}
            <div className="mb-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isRealtimeMode}
                  onChange={(e) => setIsRealtimeMode(e.target.checked)}
                  className="rounded"
                />
                <span>Auto-test realtime mode</span>
              </label>
            </div>

            {/* Jitter Slider */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jitter EMA: {metrics.jitterEma.toFixed(3)} 
                <span className={metrics.jitterEma > 0.35 ? 'text-red-600' : 'text-green-600'}>
                  {metrics.jitterEma > 0.35 ? ' (Above threshold)' : ' (Below threshold)'}
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={metrics.jitterEma}
                onChange={(e) => setMetrics(prev => ({ ...prev, jitterEma: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Loudness Slider */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loudness: {metrics.loudNorm.toFixed(3)}
                <span className={metrics.loudNorm > 0.8 ? 'text-red-600' : 'text-green-600'}>
                  {metrics.loudNorm > 0.8 ? ' (Above threshold)' : ' (Below threshold)'}
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={metrics.loudNorm}
                onChange={(e) => setMetrics(prev => ({ ...prev, loudNorm: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Target Adherence Slider */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Adherence: {(metrics.timeInTargetPct * 100).toFixed(0)}%
                <span className={metrics.timeInTargetPct < 0.5 ? 'text-yellow-600' : 'text-green-600'}>
                  {metrics.timeInTargetPct < 0.5 ? ' (Below threshold)' : ' (Above threshold)'}
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={metrics.timeInTargetPct}
                onChange={(e) => setMetrics(prev => ({ ...prev, timeInTargetPct: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Confidence Slider */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence: {metrics.confidence.toFixed(3)}
                <span className={metrics.confidence < 0.3 ? 'text-yellow-600' : 'text-green-600'}>
                  {metrics.confidence < 0.3 ? ' (Below threshold)' : ' (Above threshold)'}
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={metrics.confidence}
                onChange={(e) => setMetrics(prev => ({ ...prev, confidence: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* DTW Tier */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DTW Tier (for post-utterance testing)
              </label>
              <select
                value={dtwTier || ''}
                onChange={(e) => setDtwTier(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                <option value="1">1 (Poor)</option>
                <option value="2">2 (Fair)</option>
                <option value="3">3 (Good)</option>
                <option value="4">4 (Very Good)</option>
                <option value="5">5 (Excellent)</option>
              </select>
            </div>

            {/* End Rise Detection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Rise Detected
              </label>
              <select
                value={endRiseDetected === undefined ? '' : endRiseDetected.toString()}
                onChange={(e) => setEndRiseDetected(e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>

            {/* Test Buttons */}
            <div className="space-y-2">
              <button
                onClick={testRealtime}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Test Realtime Hints
              </button>
              <button
                onClick={testPost}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Test Post-Utterance Hints
              </button>
              <button
                onClick={() => setHintHistory([])}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear History
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            
            {/* Current Hint */}
            {lastHint && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">Current Hint</h3>
                <CoachDisplay hints={[lastHint]} />
              </div>
            )}

            {/* Hint History */}
            <div>
              <h3 className="font-medium mb-2">Hint History</h3>
              {hintHistory.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {hintHistory.slice(-10).reverse().map((entry, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="font-medium">{entry.type.toUpperCase()}</div>
                      <div className="text-gray-600">{entry.hint.text}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(entry.time).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">No hints generated yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Thresholds Reference */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Thresholds Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">Safety Thresholds</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Loudness: ≥0.80 for ≥5s triggers safety hint</li>
                <li>• Safety hints override all other hints</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Technique Thresholds</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Jitter: ≥0.35 triggers smoothness hint</li>
                <li>• Target: &lt;0.50 after 15s triggers guidance</li>
                <li>• Confidence: &lt;0.30 triggers encouragement</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Rate Limiting</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Max 1 hint per second</li>
                <li>• 4s cooldown between same hint</li>
                <li>• 12s cooldown for target miss hints</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Priority Order</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Realtime: Safety → Env → Technique</li>
                <li>• Post-utterance: Praise → Env → Safety → Technique</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
