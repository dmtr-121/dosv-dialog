export default interface SpeechRecognitionStrategy {
    start(onTranscript: (text: string) => void, onError: (error: string) => void, onHandleStop: () => void, onRecordingStarted: () => void): void;
    stop(): void;
    cleanup(): void;
}
