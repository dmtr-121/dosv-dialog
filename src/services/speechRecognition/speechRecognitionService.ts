// src/services/speechRecognition/speechRecognitionService.ts
// Модифіковано для використання лише WebAPI, DeepGram відключено
import BrowserSpeechRecognition from './browserSpeechRecognition';
import DeepgramSpeechRecognition from './deepgramSpeechRecognition';
import SpeechRecognitionStrategy from './speechRecognitionStrategy';
import io from 'socket.io-client';
import Socket = SocketIOClient.Socket;

const checkSupportedTypes = () => {
  const supportedTypes = [
      'audio/wav',
      'audio/webm',
      'audio/x-m4a',
      'audio/ogg',
      'audio/mp4',
  ];

  for (const type of supportedTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
          return type;
      }
  }

  return null;
};

export class SpeechRecognitionService {
  private strategy: SpeechRecognitionStrategy | null = null;
  private dgServerSocket: Socket | null = null;
  private lang: string;
  private preferredMimeType: string | null;
  private errorSound: HTMLAudioElement | null = null;

  constructor(
    isMobile: boolean,
    language: string,
    errorSound: HTMLAudioElement | null
  ) {
    this.preferredMimeType = checkSupportedTypes();
    this.lang = language && language !== 'en-UK' ? language : 'en-GB';
    this.errorSound = errorSound;

    // ЗМІНЕНО: Завжди використовувати BrowserSpeechRecognition, незалежно від типу пристрою
    this.strategy = new BrowserSpeechRecognition(this.lang);
    
    // Відключено код DeepGram:
    // if (isMobile && this.preferredMimeType !== null) {
    //    try {
    //        this.openWsConnection();
    //    } catch (err) {
    //        console.warn('[speechRecognitionService].constructor: Deepgram recognition couldn\'t be initiated, falling back to WebAPI', err);
    //        errorSound?.play();
    //        this.strategy = new BrowserSpeechRecognition(this.lang);
    //    }
    // } else {
    //    this.strategy = new BrowserSpeechRecognition(this.lang);
    // }
  }

  start(onTranscript: (text: string) => void, onError: (error: string) => void, onHandleStop: () => void, onRecordingStarted: () => void): void {
      if (!this.strategy) {
          console.error('[speechRecognitionService].start(): Strategy not initialized');
          this.errorSound?.play();
          // Initialize browser speech recognition as a fallback
          this.strategy = new BrowserSpeechRecognition(this.lang);
      }
      this.strategy.start(onTranscript, onError, onHandleStop, onRecordingStarted);
  }

  stop(): void {
      if (!this.strategy) {
          console.error('[speechRecognitionService].stop(): Strategy not initialized');
          this.errorSound?.play();
          return;
      }
      this.strategy.stop();
  }

  cleanup(): void {
      console.log('[speechRecognitionService].cleanup(): cleanup called in speechRecognitionService');
      this.strategy?.cleanup();
      // DeepGram clean-up code (збережено для сумісності)
      if (this.dgServerSocket) {
          console.log('[speechRecognitionService].cleanup(): Disconnecting from Deepgram WebSocket Server');
          this.closeWsConnection();
      }
  }

  get wsClientId() {
      return this.dgServerSocket?.id;
  }

  emitEndEvent() {
    console.log('[speechRecognitionService].cleanup(): emitting end event', this.dgServerSocket?.id);
    this.closeWsConnection();
    this.dgServerSocket = null;
  }

  private closeWsConnection() {
    this.dgServerSocket?.emit('end');
    this.dgServerSocket?.disconnect();
  }

  // Метод збережено для сумісності, але він ніколи не викликається
  private openWsConnection() {
    console.log('[speechRecognitionService].openWsConnection(): DeepGram disabled, using browser speech recognition only');
    
    /* Нижче вимкнений код для підключення до DeepGram
    if (!this.preferredMimeType) {
        console.warn('[speechRecognitionService].openWsConnection(): Deepgram recognition couldn\'t be initiated due to preferredMimeType, falling back to WebAPI');
        this.strategy = new BrowserSpeechRecognition(this.lang);
    }
    try {
        this.dgServerSocket = io('wss://app.codeblack.com.ua/', {
            reconnectionAttempts: 0,
            rejectUnauthorized: false
        } );
    } catch (err) {
        console.error('Couldn\'t initialize connection to Deepgram server', err);
        this.errorSound?.play();
    }

    this.dgServerSocket?.on('connect_error', (error: any) => {
        console.error('[speechRecognitionService].openWsConnection: Socket connection error:', error);
        this.errorSound?.play();
        this.dgServerSocket?.disconnect();
        this.dgServerSocket = null;
        // Fallback to BrowserSpeechRecognition or other error handling here.
        this.strategy = new BrowserSpeechRecognition(this.lang);
    });

    this.dgServerSocket?.on('connect', () => {
        console.log('[speechRecognitionService].constructor: Socket connected', this.dgServerSocket?.connected);
    });
    this.strategy = new DeepgramSpeechRecognition(this.dgServerSocket, this.lang, this.preferredMimeType!);
    */
  }
}