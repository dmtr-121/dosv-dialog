import SpeechRecognitionStrategy from './speechRecognitionStrategy';
import Socket = SocketIOClient.Socket;

export type SpeechTranscription = {
    text: string;
    isFinal: boolean;
};

export type TemporarySpeechTranscription = {
    text: string;
    offset: string;
};

export default class DeepgramSpeechRecognition implements SpeechRecognitionStrategy {
    private static WORDS_SEPARATOR = ' ';
    private static MEDIA_BATCH_SIZE_MS = 250;
    private dgServerSocket: Socket | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null;
    private transcripts: TemporarySpeechTranscription[] = [];
    private temporaryTranscripts: TemporarySpeechTranscription[] = [];
    private temporaryTranscript: TemporarySpeechTranscription = { text: '', offset: '' };
    private preferredMimeType: string;
    private audioCtx: AudioContext | null = null;

    constructor(dgServerSocket: Socket | null, _language: string, preferredMimeType: string) {
        this.dgServerSocket = dgServerSocket;
        this.preferredMimeType = preferredMimeType;
        this.audioCtx = new AudioContext();
    }

    start(onTranscript: (text: string) => void, onError: (error: string) => void, onHandleStop: () => void, onRecordingStarted: () => void) {
        this.dgServerSocket?.emit('speech-progress', true);
        console.log('[deepgramSpeechRecognition].start(): Starting Deepgram recognition');
        this.transcripts = [];
        this.temporaryTranscripts = [];
        this.temporaryTranscript = { text: '', offset: '' };

        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        } else if (!this.audioCtx) {
            console.error("[deepgramSpeechRecognition].start(): Audio context couldn't be initialized");
            return;
        }

        const dest: MediaStreamAudioDestinationNode = this.audioCtx.createMediaStreamDestination();

        try {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(micStream => {
                this.stream = micStream;
                console.log('[deepgramSpeechRecognition].start(): Media stream instantiated');

                if (!MediaRecorder.isTypeSupported(this.preferredMimeType)) {
                    console.error('Browser is not supported');
                    onError('Browser is not supported');
                    stop();
                    return;
                }

                const src = this.audioCtx!.createMediaStreamSource(micStream);
                src.connect(dest);
            
                if (!this.mediaRecorder) {
                    this.mediaRecorder = new MediaRecorder(this.stream, {
                        mimeType: this.preferredMimeType
                    });
                }

                if (!this.dgServerSocket) {
                    throw new Error('Couldn\'t instantiate connection to Deepgram WebSocket Server');
                }

                // TODO: reconnection logic
                if (this.dgServerSocket.connected) {
                    console.log('[deepgramSpeechRecognition].start(): Established connection to Deepgram WebSocket Server', this.dgServerSocket.id);

                    if (!this.mediaRecorder) {
                        onError('MediaRecorder is not initialized');
                        stop();
                    }

                    this.mediaRecorder.addEventListener('dataavailable', event => {
                        if (event.data.size > 0) {
                            this.dgServerSocket?.emit('audio', event.data);
                        }
                    });

                    this.mediaRecorder.onstart = () => {
                        console.log('[deepgramSpeechRecognition].start(): MediaRecorder started');
                        onRecordingStarted();
                    }

                    this.mediaRecorder.addEventListener('error', event => {
                        console.error(`MediaRecorder error: ${event.error}`);
                        onError(`MediaRecorder error: ${event.error}`);
                        stop();
                    });

                    this.mediaRecorder.start(DeepgramSpeechRecognition.MEDIA_BATCH_SIZE_MS);
                } else {
                    console.error('Couldn\'t connect to Deepgram WebSocket Server yet, need to reconnect');
                    onError('Couldn\'t connect to Deepgram WebSocket Server yet, need to reconnect');
                    stop();
                }

                this.dgServerSocket.on('transcript', (data: string, serverOffset: string) => {
                    const transcription = JSON.parse(data) as SpeechTranscription;
                    console.log('[deepgramSpeechRecognition].start(): Received data from Deepgram WebSocket Server:', transcription, this.dgServerSocket?.connected, this.dgServerSocket?.id);
                    if (transcription && transcription.text.trim().length > 0 && this.dgServerSocket?.connected) {
                        let currentTranscription = '';

                        if (!transcription.isFinal) {
                            this.temporaryTranscript = { text: transcription.text.trim(), offset: serverOffset } as TemporarySpeechTranscription;
                            if (this.temporaryTranscripts.length === 0) {
                                this.temporaryTranscripts.push(this.temporaryTranscript);
                                currentTranscription = this.transcripts.map(t => t.text).join(DeepgramSpeechRecognition.WORDS_SEPARATOR).concat(transcription.text.trim());
                            } else if (this.transcripts.length === 0 && this.temporaryTranscripts.map(t => t.offset).includes(serverOffset)) {
                                return;
                            } else if (this.temporaryTranscripts.map(t => t.offset).includes(serverOffset)) {
                                currentTranscription = this.transcripts.map(t => t.text).join(DeepgramSpeechRecognition.WORDS_SEPARATOR);
                            } else {
                                this.temporaryTranscripts.push(this.temporaryTranscript);
                                currentTranscription = this.transcripts.map(t => t.text).join(DeepgramSpeechRecognition.WORDS_SEPARATOR).concat(transcription.text.trim());
                            }
                        } else {
                            const finalTranscript = { text: transcription.text.trim(), offset: serverOffset } as TemporarySpeechTranscription;
                            if (this.temporaryTranscripts.length === 0 && this.transcripts.length === 0) {
                                this.transcripts.push(finalTranscript);
                                currentTranscription = finalTranscript.text;
                            } else if (this.transcripts.length === 0) {
                                this.transcripts.push(finalTranscript);
                                this.temporaryTranscripts = [];
                                currentTranscription = finalTranscript.text;
                            } else if (this.transcripts.map(t => t.offset).includes(serverOffset)) {
                                return;
                            } else if (this.temporaryTranscripts.length === 0) {
                                this.transcripts.push(finalTranscript);
                                currentTranscription = this.transcripts.map(t => t.text).join(DeepgramSpeechRecognition.WORDS_SEPARATOR);
                            } else {
                                this.transcripts.push(finalTranscript);
                                this.temporaryTranscripts = [];
                                currentTranscription = this.transcripts.map(t => t.text).join(DeepgramSpeechRecognition.WORDS_SEPARATOR);
                            }
                        }

                        if (!currentTranscription) {
                            return;
                        }

                        console.log('[deepgramSpeechRecognition].start(): triggering onTranscript:', currentTranscription, serverOffset);
                        onTranscript(currentTranscription);
                    }
                });

                this.dgServerSocket.on('stop', () => {
                    console.log('[deepgramSpeechRecognition].start(): stop event received from WS server');
                    onHandleStop();
                });

                this.dgServerSocket.on('error', (err: string) => {
                    onError(err);
                    console.log('[deepgramSpeechRecognition].start(): Error from Deepgram WebSocket Server received:', err);
                });

                this.dgServerSocket.on('disconnect', () => {
                    console.log('[deepgramSpeechRecognition].start(): Connection was closed to Deepgram WebSocket Server');
                    onHandleStop();
                });
            });
        } catch (error) {
            onError(`Failed to start Deepgram recognition: ${error}`);
            stop();
        }
    }

    stop() {
        console.log('[deepgramSpeechRecognition].stop(): stop called in DG speech recognition service', this.dgServerSocket?.id);
        this.dgServerSocket?.emit('speech-progress', false);

        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            return;
        }
        this.audioCtx?.suspend();
        if (this.mediaRecorder?.state === 'recording') {
            this.mediaRecorder.stop();
        }

        this.stream?.getTracks().forEach(track => track.stop());
        this.stream = null;
        this.mediaRecorder = null;
    }

    cleanup() {
        console.log('[deepgramSpeechRecognition].cleanup(): cleanup called in DG speech recognition service');
        if (this.dgServerSocket && this.dgServerSocket.connected) {
            this.dgServerSocket.close();
        }
        this.dgServerSocket = null;
    }
}
