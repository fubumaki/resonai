'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FlowRunner from '@/components/Flows/FlowRunner';
import { FlowV1, StepResult } from '@/flows/schema';
import { trackScreenView, trackActivation } from '@/lib/analytics';

export default function TryPage() {
  const [flow, setFlow] = useState<FlowV1 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Track screen view
    trackScreenView('try_page');
    
    // Load the DailyPractice flow
    loadDailyPracticeFlow();
  }, []);

  const loadDailyPracticeFlow = async () => {
    try {
      const response = await fetch('/flows/presets/DailyPractice_v1.json');
      if (!response.ok) {
        throw new Error(`Failed to load flow: ${response.statusText}`);
      }
      
      const flowData: FlowV1 = await response.json();
      setFlow(flowData);
    } catch (err) {
      console.error('Failed to load DailyPractice flow:', err);
      setError(err instanceof Error ? err.message : 'Failed to load practice flow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlowComplete = (results: StepResult[]) => {
    console.log('Flow completed with results:', results);
    
    // Track activation
    trackActivation('daily_practice_complete');
    
    // Calculate session summary
    const sessionSummary = {
      ts: Date.now(),
      medianF0: calculateMedianF0(results),
      inBandPct: calculateInBandPercentage(results),
      prosodyVar: calculateProsodyVariance(results),
      voicedTimePct: calculateVoicedTimePercentage(results),
      jitterEma: calculateAverageJitter(results),
      comfort: results.find(r => r.stepId === 'reflection')?.metrics.comfort as number || 3,
      fatigue: results.find(r => r.stepId === 'reflection')?.metrics.fatigue as number || 3,
      euphoria: results.find(r => r.stepId === 'reflection')?.metrics.euphoria as number || 3,
    };
    
    // Store session in IndexedDB (implement storage logic)
    storeSessionSummary(sessionSummary);
    
    // Show completion message and redirect
    setTimeout(() => {
      router.push('/practice?completed=true');
    }, 2000);
  };

  const handleStepChange = (stepId: string, metrics: Record<string, number | boolean>) => {
    console.log(`Step ${stepId} metrics:`, metrics);
    // Could emit analytics events here for step-level tracking
  };

  // Helper functions for session summary calculation
  const calculateMedianF0 = (results: StepResult[]): number | null => {
    const pitchValues = results
      .filter(r => r.stepId !== 'reflection')
      .map(r => r.metrics.medianF0)
      .filter((f0): f0 is number => typeof f0 === 'number');
    
    if (pitchValues.length === 0) return null;
    
    const sorted = pitchValues.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? 
      (sorted[mid - 1] + sorted[mid]) / 2 : 
      sorted[mid];
  };

  const calculateInBandPercentage = (results: StepResult[]): number => {
    const inBandValues = results
      .filter(r => r.stepId !== 'reflection' && typeof r.metrics.timeInTargetPct === 'number')
      .map(r => r.metrics.timeInTargetPct as number);
    
    return inBandValues.length > 0 ? 
      inBandValues.reduce((sum, val) => sum + val, 0) / inBandValues.length : 0;
  };

  const calculateProsodyVariance = (results: StepResult[]): number => {
    const prosodyValues = results
      .filter(r => r.stepId !== 'reflection' && typeof r.metrics.expressiveness === 'number')
      .map(r => r.metrics.expressiveness as number);
    
    if (prosodyValues.length === 0) return 0;
    
    const mean = prosodyValues.reduce((sum, val) => sum + val, 0) / prosodyValues.length;
    const variance = prosodyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / prosodyValues.length;
    return Math.sqrt(variance);
  };

  const calculateVoicedTimePercentage = (results: StepResult[]): number => {
    const voicedValues = results
      .filter(r => r.stepId !== 'reflection' && typeof r.metrics.voicedTimePct === 'number')
      .map(r => r.metrics.voicedTimePct as number);
    
    return voicedValues.length > 0 ? 
      voicedValues.reduce((sum, val) => sum + val, 0) / voicedValues.length : 0;
  };

  const calculateAverageJitter = (results: StepResult[]): number => {
    const jitterValues = results
      .filter(r => r.stepId !== 'reflection' && typeof r.metrics.jitterEma === 'number')
      .map(r => r.metrics.jitterEma as number);
    
    return jitterValues.length > 0 ? 
      jitterValues.reduce((sum, val) => sum + val, 0) / jitterValues.length : 0;
  };

  const storeSessionSummary = async (summary: any) => {
    try {
      // TODO: Implement IndexedDB storage
      console.log('Storing session summary:', summary);
    } catch (error) {
      console.error('Failed to store session summary:', error);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading practice flow...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="text-red-500 text-4xl">⚠️</div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Unable to Load Practice</h1>
          <p className="text-slate-600 dark:text-slate-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!flow) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-600 dark:text-slate-400">No practice flow available</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <FlowRunner
          flow={flow}
          onComplete={handleFlowComplete}
          onStepChange={handleStepChange}
          className="max-w-2xl mx-auto"
        />
      </div>
    </main>
  );
}