'use client';

import { useState } from 'react';
import MicCalibrationFlow from '@/components/MicCalibrationFlow';
import { useMicCalibration } from '@/hooks/useMicCalibration';

export default function CalibrationDemo() {
  const [showCalibration, setShowCalibration] = useState(false);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const { config, isConfigured, saveConfig, clearConfig, retestMic } = useMicCalibration();

  const handleStartCalibration = () => {
    setShowCalibration(true);
    setCalibrationComplete(false);
  };

  const handleCalibrationComplete = (config: any) => {
    saveConfig(config);
    setShowCalibration(false);
    setCalibrationComplete(true);
  };

  const handleCalibrationCancel = () => {
    setShowCalibration(false);
  };

  const handleRetest = () => {
    retestMic();
    setShowCalibration(true);
    setCalibrationComplete(false);
  };

  const handleClearConfig = () => {
    clearConfig();
    setCalibrationComplete(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Mic Calibration Demo
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Test the 3-step microphone calibration flow
          </p>
        </div>

        {showCalibration ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <MicCalibrationFlow
              onComplete={handleCalibrationComplete}
              onCancel={handleCalibrationCancel}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Status */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Current Status
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Calibration Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isConfigured 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {isConfigured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>

                {config && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Device:</span>
                      <span className="text-slate-900 dark:text-slate-100 font-mono text-sm">
                        {config.deviceId || 'System Default'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Echo Cancellation:</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        {config.constraints.echoCancellation ? '✓' : '✗'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Noise Suppression:</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        {config.constraints.noiseSuppression ? '✓' : '✗'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Auto Gain Control:</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        {config.constraints.autoGainControl ? '✓' : '✗'}
                      </span>
                    </div>

                    {config.levelSettings && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Gain Level:</span>
                          <span className="text-slate-900 dark:text-slate-100">
                            {Math.round(config.levelSettings.gain)}%
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Noise Floor:</span>
                          <span className="text-slate-900 dark:text-slate-100">
                            {Math.round(config.levelSettings.noiseFloor)}%
                          </span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Actions
              </h2>
              
              <div className="space-y-3">
                <button
                  onClick={handleStartCalibration}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  {isConfigured ? 'Recalibrate Microphone' : 'Start Calibration'}
                </button>

                {isConfigured && (
                  <>
                    <button
                      onClick={handleRetest}
                      className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200"
                    >
                      Retest Microphone
                    </button>

                    <button
                      onClick={handleClearConfig}
                      className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200"
                    >
                      Clear Configuration
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                How it works
              </h3>
              <ul className="text-blue-800 dark:text-blue-200 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 mr-2">1.</span>
                  <span>Select your microphone from available devices</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 mr-2">2.</span>
                  <span>Calibrate audio levels and check for noise floor</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 mr-2">3.</span>
                  <span>Test your environment and complete setup</span>
                </li>
              </ul>
            </div>

            {calibrationComplete && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                <div className="flex items-center">
                  <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                  <span className="text-green-800 dark:text-green-200 font-medium">
                    Calibration completed successfully!
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
