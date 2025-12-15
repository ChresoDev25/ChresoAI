import React from 'react';
import { VoiceWidget } from './components/VoiceWidget';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Decorative background element */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-orange-100 rounded-full blur-3xl opacity-30"></div>
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 max-w-md w-full text-center space-y-8">

        {/* Logo */}
        <div className="mx-auto w-24 h-24 bg-blue-900 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-900/20">
          <img
            src="https://github.com/ChresoDev25/ChresoAI/blob/main/image/chreso-logo.png?raw=true"
            alt="Logo"
            className="w-16 h-16 object-contain"
          />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Chreso University</h1>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider">
            AI Voice Assistant
          </div>
        </div>

        <p className="text-slate-500 text-lg leading-relaxed">
          Tap the floating avatar below and Say... <span className="font-bold" style={{ color: "#a80909ff" }}>"Hello"</span> to get started.
        </p>


      </div>

      {/* The Widget */}
      <VoiceWidget />

    </div>
  );
}

export default App;
