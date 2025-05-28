// Simple utility for audio feedback in interactive components

// Cache for audio objects to avoid recreating them
const audioCache: Record<string, HTMLAudioElement> = {};

/**
 * Play a success sound with configurable options
 */
export const playSuccessSound = (options: { volume?: number } = {}): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const soundUrl = '/success.mp3'; // Default sound URL
      const volume = options.volume || 0.5;
      
      // Use cached audio if available
      if (!audioCache[soundUrl]) {
        audioCache[soundUrl] = new Audio(soundUrl);
      }
      
      const audio = audioCache[soundUrl];
      audio.volume = volume;
      
      // Reset the audio to start from the beginning
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            resolve();
          })
          .catch(e => {
            console.log('Audio play failed:', e);
            // If audio fails, create a new audio object for next attempt
            delete audioCache[soundUrl];
            reject(e);
          });
      } else {
        // For browsers where play() doesn't return a promise
        resolve();
      }
    } catch (error) {
      console.error('Error playing success sound:', error);
      reject(error);
    }
  });
};

/**
 * Play an error sound with configurable options
 */
export const playErrorSound = (options: { volume?: number } = {}): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const soundUrl = '/error.mp3'; // Default sound URL
      const volume = options.volume || 0.3;
      
      // Use cached audio if available
      if (!audioCache[soundUrl]) {
        audioCache[soundUrl] = new Audio(soundUrl);
      }
      
      const audio = audioCache[soundUrl];
      audio.volume = volume;
      
      // Reset the audio to start from the beginning
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            resolve();
          })
          .catch(e => {
            console.log('Audio play failed:', e);
            // If audio fails, create a new audio object for next attempt
            delete audioCache[soundUrl];
            reject(e);
          });
      } else {
        // For browsers where play() doesn't return a promise
        resolve();
      }
    } catch (error) {
      console.error('Error playing error sound:', error);
      reject(error);
    }
  });
};

/**
 * Alternative solution with synthetic sounds if audio files aren't available
 */
export const playSyntheticSuccess = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.1); // G5
    oscillator.frequency.setValueAtTime(1046.5, audioContext.currentTime + 0.2); // C6
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Error playing synthetic success sound:', error);
  }
};

/**
 * Alternative solution with synthetic sounds if audio files aren't available
 */
export const playSyntheticError = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
    oscillator.frequency.setValueAtTime(110, audioContext.currentTime + 0.2); // A2
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (error) {
    console.error('Error playing synthetic error sound:', error);
  }
};