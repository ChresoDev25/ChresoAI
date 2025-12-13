export interface LiveConfig {
  model: string;
  systemInstruction: string;
  voiceName: string;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioContextState {
  inputContext: AudioContext | null;
  outputContext: AudioContext | null;
}
