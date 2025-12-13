import React, { useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { ConnectionState } from '../types';

// Updated Avatar URL to match the mid 30s African indigenous male anime-style AI agent description
const AVATAR_URL = "/image/chreso.png"; 

export const VoiceWidget: React.FC = () => {
  const { connectionState, errorMessage, isSpeaking, connect, disconnect } = useGeminiLive();

  const handleClick = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  // Auto-disconnect if component unmounts
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  return (
    <div className="fixed bottom-10 right-10 z-50 flex flex-col items-center gap-4">
      
      {/* Error Message Toast */}
      {errorMessage && (
        <div className="absolute bottom-32 bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap animate-fade-in-up">
          {errorMessage}
        </div>
      )}

      {/* Main Floating Interaction Button */}
      <div className="relative group">
          <button
            onClick={handleClick}
            disabled={isConnecting}
            className={`
              relative flex items-center justify-center w-24 h-24 rounded-full shadow-2xl transition-all duration-300
              ${isConnected ? 'ring-4 ring-blue-400 ring-offset-4 ring-offset-white' : 'hover:scale-105'}
              bg-white z-20
            `}
          >
            {/* Avatar Image */}
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white relative z-10">
              <img 
                  src={AVATAR_URL} 
                  className={`w-full h-full object-cover transition-opacity duration-300 ${isConnecting ? 'opacity-50' : 'opacity-100'}`}
                  alt="Chreso Assistant"
              />
            </div>

            {/* Pulse Animation when Speaking */}
            {isConnected && isSpeaking && (
              <span className="absolute inset-0 rounded-full border-4 border-blue-500 animate-pulse-ring z-0"></span>
            )}
            
            {/* Connecting Spinner */}
            {isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}

            {/* Status Badge Icon */}
            <div className={`
              absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center z-20 shadow-sm transition-colors duration-300
              ${isConnected ? 'bg-red-500' : 'bg-blue-600'}
            `}>
              {isConnected ? (
                <MicOff size={14} className="text-white" />
              ) : (
                <Mic size={14} className="text-white" />
              )}
            </div>
          </button>
      </div>

      {/* Helper Text */}
      <div className={`
        bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md border border-gray-100 text-sm font-medium text-gray-600
        transition-all duration-300 transform
        ${isConnected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
      `}>
        {isSpeaking ? "Speaking..." : "Tap to disconnect"}
      </div>

    </div>
  );
};