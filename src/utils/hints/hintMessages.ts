export const HINT_MESSAGES = {
  REPEAT_ANSWER: "Please repeat the answer exactly as shown.",
  
  CORRECT: "Excellent! Moving to the next sentence.",
  
  INCORRECT: "That's not quite right. Try again!",
  
  ALMOST: "You're close! Pay attention to the exact wording.",
  
  PROGRESS: "Getting better! Keep trying.",
  
  SHORT_SUCCESS_MESSAGES: [
    "Awesome! 🎉",
    "Perfect! Well done! 🎉",
    "Great job! 👍",
    "Excellent! 👏",
    "Superb! ✨",
    "Fantastic! 🌟",
    "Wonderful! 😊",
    "Amazing! 🤩",
    "Terrific! 💯",
    "Incredible! 🤯",
    "Well done! ✅",
    "Top notch! 👌"
  ],

  getRandomShortSuccess(count = 2): { messages: string[], delays: number[] } {
    const messages: string[] = [];
    const delays: number[] = [];
    const messageCount = Math.min(Math.max(2, count), 3); // Get 2-3 messages
    const usedIndices = new Set<number>();
    
    while (messages.length < messageCount) {
      const randomIndex = Math.floor(Math.random() * this.SHORT_SUCCESS_MESSAGES.length);
      if (!usedIndices.has(randomIndex)) {
        messages.push(this.SHORT_SUCCESS_MESSAGES[randomIndex]);
        delays.push(300 + (messages.length * 500)); // Incremental delays
        usedIndices.add(randomIndex);
      }
    }
    
    return { messages, delays };
  }
} as const;