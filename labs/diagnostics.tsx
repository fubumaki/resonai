'use client';

import React, { useState, useEffect } from 'react';

interface DiagnosticData {
  isolation: {
    crossOriginIsolated: boolean;
    sharedArrayBuffer: boolean;
    audioWorklet: boolean;
  };
  device: {
    sampleRate: number;
    channelCount: number;
    deviceId: string;
    label: string;
  };
  coach: {
    emissions: any[];
    thresholds: Record<string, number>;
    canSimulate: boolean;
  };
  loudness: {
    current: number;
    max: number;
    average: number;
    readings: Array<{ timestamp: number; loudness: number }>;
  };
  network: {
    requests: Array<{ url: string; method: string; timestamp: number }>;
    localOnly: boolean;
  };
  a11y: {
    ariaLiveRegions: number;
    labeledElements: number;
    focusableElements: number;
  };
}

export default function DiagnosticsPage() {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkIsolation = (): DiagnosticData['isolation'] => {
    return {
      crossOriginIsolated: window.crossOriginIsolated,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      audioWorklet: typeof AudioWorklet !== 'undefined'
    };
  };

  const checkDevice = async (): Promise<DiagnosticData['device']> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      
      stream.getTracks().forEach(track => track.stop());
      
      return {
        sampleRate: settings.sampleRate || 0,
        channelCount: settings.channelCount || 0,
        deviceId: settings.deviceId || '',
        label: (settings as any).label || 'Unknown device'
      };
    } catch (error) {
      addLog(`Device check failed: ${error}`);
      return {
        sampleRate: 0,
        channelCount: 0,
        deviceId: '',
        label: 'No device access'
      };
    }
  };

  const checkCoach = (): DiagnosticData['coach'] => {
    return {
      emissions: (window as any).__coachEmits || [],
      thresholds: (window as any).__prosodyThresholds || {},
      canSimulate: typeof (window as any).__coachSimulate !== 'undefined'
    };
  };

  const checkLoudness = (): DiagnosticData['loudness'] => {
    const readings = (window as any).__loudnessReadings || [];
    const max = (window as any).__maxLoudness || 0;
    const current = readings.length > 0 ? readings[readings.length - 1].loudness : 0;
    const average = readings.length > 0 
      ? readings.reduce((sum: number, r: any) => sum + r.loudness, 0) / readings.length 
      : 0;

    return {
      current,
      max,
      average,
      readings: readings.slice(-50) // Last 50 readings
    };
  };

  const checkNetwork = (): DiagnosticData['network'] => {
    const requests = (window as any).__networkRequests || [];
    const localOnly = requests.every((req: any) => 
      req.url.startsWith(window.location.origin) || 
      req.url.startsWith('blob:') ||
      req.url.startsWith('data:')
    );

    return {
      requests,
      localOnly
    };
  };

  const checkA11y = (): DiagnosticData['a11y'] => {
    const ariaLiveRegions = document.querySelectorAll('[aria-live]').length;
    const labeledElements = document.querySelectorAll('[aria-label], [aria-labelledby]').length;
    const focusableElements = document.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])').length;

    return {
      ariaLiveRegions,
      labeledElements,
      focusableElements
    };
  };

  const runDiagnostics = async () => {
    addLog('Running diagnostics...');
    
    const diagnosticData: DiagnosticData = {
      isolation: checkIsolation(),
      device: await checkDevice(),
      coach: checkCoach(),
      loudness: checkLoudness(),
      network: checkNetwork(),
      a11y: checkA11y()
    };

    setData(diagnosticData);
    addLog('Diagnostics complete');
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    addLog('Started monitoring...');
    
    // Monitor device changes
    navigator.mediaDevices.ondevicechange = () => {
      addLog('Device change detected');
      runDiagnostics();
    };

    // Monitor coach emissions
    const originalEmits = (window as any).__coachEmits;
    if (originalEmits) {
      (window as any).__coachEmits = [];
      const originalPush = Array.prototype.push;
      Array.prototype.push = function(...items) {
        const result = originalPush.apply(this, items);
        addLog(`Coach hint: ${items[0]?.hintId || 'unknown'}`);
        return result;
      };
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    addLog('Stopped monitoring');
    
    // Restore original functions
    if ((window as any).__originalPush) {
      Array.prototype.push = (window as any).__originalPush;
    }
  };

  const exportData = () => {
    if (!data) return;
    
    const exportData = {
      timestamp: new Date().toISOString(),
      data,
      logs
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resonai-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog('Data exported');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Resonai Diagnostics</h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex gap-4 mb-4">
            <button
              onClick={runDiagnostics}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Run Diagnostics
            </button>
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`px-4 py-2 rounded ${
                isMonitoring 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Export Data
            </button>
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Logs
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            Status: {isMonitoring ? 'Monitoring active' : 'Monitoring stopped'}
          </div>
        </div>

        {/* Diagnostic Results */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Isolation */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Isolation Status</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Cross-Origin Isolated:</span>
                  <span className={data.isolation.crossOriginIsolated ? 'text-green-600' : 'text-red-600'}>
                    {data.isolation.crossOriginIsolated ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>SharedArrayBuffer:</span>
                  <span className={data.isolation.sharedArrayBuffer ? 'text-green-600' : 'text-red-600'}>
                    {data.isolation.sharedArrayBuffer ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>AudioWorklet:</span>
                  <span className={data.isolation.audioWorklet ? 'text-green-600' : 'text-red-600'}>
                    {data.isolation.audioWorklet ? '✅' : '❌'}
                  </span>
                </div>
              </div>
            </div>

            {/* Device */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Audio Device</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sample Rate:</span>
                  <span>{data.device.sampleRate} Hz</span>
                </div>
                <div className="flex justify-between">
                  <span>Channels:</span>
                  <span>{data.device.channelCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Device ID:</span>
                  <span className="text-xs">{data.device.deviceId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Label:</span>
                  <span className="text-xs">{data.device.label}</span>
                </div>
              </div>
            </div>

            {/* Coach */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Coach System</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Emissions:</span>
                  <span>{data.coach.emissions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Thresholds:</span>
                  <span>{Object.keys(data.coach.thresholds).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Can Simulate:</span>
                  <span className={data.coach.canSimulate ? 'text-green-600' : 'text-red-600'}>
                    {data.coach.canSimulate ? '✅' : '❌'}
                  </span>
                </div>
              </div>
            </div>

            {/* Loudness */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Loudness Guard</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Current:</span>
                  <span>{data.loudness.current.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max:</span>
                  <span>{data.loudness.max.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average:</span>
                  <span>{data.loudness.average.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Readings:</span>
                  <span>{data.loudness.readings.length}</span>
                </div>
              </div>
            </div>

            {/* Network */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Network Privacy</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Requests:</span>
                  <span>{data.network.requests.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Local Only:</span>
                  <span className={data.network.localOnly ? 'text-green-600' : 'text-red-600'}>
                    {data.network.localOnly ? '✅' : '❌'}
                  </span>
                </div>
              </div>
            </div>

            {/* A11y */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Accessibility</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Aria-Live Regions:</span>
                  <span>{data.a11y.ariaLiveRegions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Labeled Elements:</span>
                  <span>{data.a11y.labeledElements}</span>
                </div>
                <div className="flex justify-between">
                  <span>Focusable Elements:</span>
                  <span>{data.a11y.focusableElements}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Activity Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

