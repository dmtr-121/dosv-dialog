// Simple device detection utility 
export const isMobileDevice = (): boolean => {
  return /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};