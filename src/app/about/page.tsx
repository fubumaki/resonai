import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About & Privacy - Resonai',
  description: 'Privacy policy and technical details for Resonai voice training app',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">About & Privacy</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Privacy & Data</h2>
          
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>Local‑first:</strong> Your voice is analyzed on your device. No audio or metrics are sent to a server by default.
            </p>
            
            <p>
              <strong>What&apos;s stored:</strong> Small session summaries (time‑in‑target, smoothness proxy, etc.) are saved in your browser (IndexedDB) so you can review progress offline.
            </p>
            
            <p>
              <strong>Your control:</strong> Export your data as JSON any time, or <strong>Delete All</strong> from Settings—both work offline and remove local data immediately.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">How it works (short version)</h2>
          
          <p className="text-gray-700">
            We use your microphone with echo cancellation, noise suppression, and auto gain <strong>disabled</strong> for fidelity. 
            A local pitch detector (CREPE‑tiny or YIN fallback) plus light smoothing powers the ribbon and gentle feedback. 
            Everything runs in your browser, with low latency on Windows 11 + Firefox.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">Technical Details</h2>
          
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold mb-2">Audio Processing</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Cross-origin isolation enabled for WASM SIMD + threads</li>
                <li>CREPE-tiny ONNX model for high-accuracy pitch detection</li>
                <li>YIN algorithm fallback for compatibility</li>
                <li>Median filter + Kalman smoothing for stable readings</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Flow System</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>JSON-driven practice flows (versioned, local-first)</li>
                <li>Dynamic Time Warping for intonation matching</li>
                <li>End-rise detection for question intonation</li>
                <li>Expressiveness metrics for pitch variability</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Browser Compatibility</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Optimized for Windows 11 + Firefox</li>
                <li>Service Worker for offline functionality</li>
                <li>IndexedDB for local session storage</li>
                <li>Web Audio API with ScriptProcessorNode</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
