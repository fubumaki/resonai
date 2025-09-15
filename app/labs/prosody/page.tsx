'use client';

import { useState, useEffect } from 'react';
import { ProsodyDrill, ProsodyDrillResult } from '@/components/drills/ProsodyDrill';
import { ProsodyPracticeCard } from '@/components/cards/ProsodyPracticeCard';
import { ExpressivenessMeter } from '@/components/ExpressivenessMeter';
import { getRandomPrompt } from '@/data/prosodyPrompts';
import { generateMockTelemetry } from '@/engine/audio/mockTelemetry';
import { Telemetry } from '@/engine/audio/useTelemetryBuffer';
import { exportEvents } from '@/engine/metrics/eventStore';
import { PerfOverlay } from '../_components/PerfOverlay';
import { Recorder } from '../_components/Recorder';

export default function LabsProsody() {
  const [results, setResults] = useState<ProsodyDrillResult[]>([]);
  const [currentPrompt] = useState(() => getRandomPrompt());
  const [currentMode, setCurrentMode] = useState<'statement' | 'question'>('statement');
  const [usePracticeCard, setUsePracticeCard] = useState(false);

  // Mock pattern injection for development
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const pattern = params.get('mock'); // 'question' | 'statement' | 'rising' | 'falling' | 'flat'
    
    if (pattern && process.env.NODE_ENV !== 'production') {
      const frames = generateMockTelemetry({ 
        pattern: pattern as 'rising' | 'falling' | 'flat' | 'question' | 'random', 
        baseHz: 190, 
        duration: 2600 
      });
      
      let i = 0;
      const id = setInterval(() => {
        if (i >= frames.length) { 
          clearInterval(id); 
          return; 
        }
        
        // Inject mock telemetry
        const mockBridge = (window as unknown as Record<string, unknown>).__mockTelemetryCallback as ((telem: Telemetry) => void) | undefined;
        if (mockBridge) {
          mockBridge(frames[i]);
        }
        i++;
      }, 16);
      
      return () => clearInterval(id);
    }
  }, []);

  const handleComplete = (result: ProsodyDrillResult) => {
    setResults(prev => [...prev, result]);
    
    // Auto-advance to next mode
    if (result.mode === 'statement') {
      setCurrentMode('question');
    } else {
      setCurrentMode('statement');
    }
  };

  const handlePracticeCardComplete = (results: ProsodyDrillResult[]) => {
    setResults(results);
  };

  const reset = () => {
    setResults([]);
    setCurrentMode('statement');
  };

  const handleExportEvents = async () => {
    try {
      const eventsJson = await exportEvents();
      const blob = new Blob([eventsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prosody-events-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export events:', error);
    }
  };

  const getResultIcon = (result: ProsodyDrillResult) => {
    return result.pass ? '✅' : '❌';
  };

  const getResultColor = (result: ProsodyDrillResult) => {
    return result.pass ? 'text-green-600' : 'text-red-600';
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Prosody Lab</h1>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={usePracticeCard}
                onChange={(e) => setUsePracticeCard(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Use Practice Card</span>
            </label>
            <button
              onClick={handleExportEvents}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Export Events
            </button>
          </div>
        </div>
        
        {usePracticeCard ? (
          <ProsodyPracticeCard
            promptId={currentPrompt.id}
            onComplete={handlePracticeCardComplete}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Current Drill */}
          <div>
            <ProsodyDrill
              text={currentMode === 'statement' ? currentPrompt.statement : currentPrompt.question}
              mode={currentMode}
              promptId={currentPrompt.id}
              onComplete={handleComplete}
            />
            
            {results.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Results</h3>
                  <button 
                    onClick={reset}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Reset
                  </button>
                </div>
                
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm p-4 border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {getResultIcon(result)} {result.mode === 'question' ? 'Question' : 'Statement'}
                        </span>
                        <span className={`text-sm font-semibold ${getResultColor(result)}`}>
                          {result.label.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Slope: {result.slopeCentsPerSec.toFixed(0)} c/s</div>
                        <div>Voiced: {result.voicedMs.toFixed(0)}ms</div>
                        <div className="mt-2">
                          <ExpressivenessMeter value01={result.expressiveness01} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Instructions */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Instructions</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold">Statement Practice</h3>
                  <p className="text-sm">Speak with falling intonation at the end. This is typical for declarative statements.</p>
                </div>
                <div>
                  <h3 className="font-semibold">Question Practice</h3>
                  <p className="text-sm">Speak with rising intonation at the end. This is typical for yes/no questions.</p>
                </div>
                <div>
                  <h3 className="font-semibold">Expressiveness</h3>
                  <p className="text-sm">The meter shows pitch variability. Higher values indicate more melodic, expressive speech.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Tips</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Speak naturally - don&apos;t force exaggerated contours</li>
                <li>• Practice in a quiet environment for best results</li>
                <li>• Watch the expressiveness meter to develop more melodic speech</li>
                <li>• The system detects end-rise vs end-fall patterns</li>
                <li>• Green checkmarks indicate successful contour matching</li>
              </ul>
            </div>

            {results.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Summary</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Total attempts:</span> {results.length}
                  </div>
                  <div>
                    <span className="font-medium">Successful:</span> {results.filter(r => r.pass).length}
                  </div>
                  <div>
                    <span className="font-medium">Average expressiveness:</span> {
                      (results.reduce((sum, r) => sum + r.expressiveness01, 0) / results.length * 100).toFixed(0)
                    }%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Performance monitoring overlays */}
      <PerfOverlay />
      <Recorder />
    </main>
  );
}
