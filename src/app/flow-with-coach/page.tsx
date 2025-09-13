'use client';

import { useEffect, useState } from 'react';
import { FlowRunnerWithCoach } from '@/flow/FlowRunnerWithCoach';
import { FlowJson } from '@/flow/types';
import { validateFlowJson } from '@/flow/schema';

export default function FlowWithCoachPage() {
  const [flowJson, setFlowJson] = useState<FlowJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFlow();
  }, []);

  const loadFlow = async () => {
    try {
      const response = await fetch('/flows/daily_v1.json');
      if (!response.ok) {
        throw new Error(`Failed to load flow: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Validate flow JSON schema
      const validation = validateFlowJson(data);
      if (!validation.success) {
        throw new Error(validation.error || 'Flow validation failed');
      }
      
      setFlowJson(data as FlowJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading practice flow with AI coach...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Flow</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!flowJson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No flow data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-800">
              AI Coach Active - Providing real-time guidance
            </span>
          </div>
        </div>
      </div>
      <FlowRunnerWithCoach flowJson={flowJson} />
    </div>
  );
}
