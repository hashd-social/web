/**
 * Parse and humanize error messages from contracts and wallet interactions
 */
export const parseErrorMessage = (error: string | null | Error): string => {
  if (!error) return '';
  
  const errorString = typeof error === 'string' ? error : error.message || String(error);
  
  // Check for user rejection
  if (errorString.includes('user rejected') || errorString.includes('User declined') || errorString.includes('ACTION_REJECTED')) {
    return '❌ Transaction cancelled - You rejected the signature request';
  }
  
  // Check for insufficient funds
  if (errorString.includes('insufficient funds')) {
    return '💰 Insufficient funds - You need more ETH to complete this transaction';
  }
  
  // Check for name already taken
  if (errorString.includes('already taken') || errorString.includes('Name already exists')) {
    return '⚠️ This name is already taken - Please choose a different name';
  }
  
  // Check for invalid name
  if (errorString.includes('Invalid name')) {
    return '⚠️ Invalid name - Use only lowercase letters, numbers, and underscores';
  }
  
  // Check for network errors
  if (errorString.includes('network') || errorString.includes('connection')) {
    return '🌐 Network error - Please check your connection and try again';
  }
  
  // Check for gas estimation errors
  if (errorString.includes('gas') || errorString.includes('out of gas')) {
    return '⛽ Gas estimation failed - Transaction may fail or cost too much';
  }
  
  // Check for nonce errors
  if (errorString.includes('nonce')) {
    return '🔄 Transaction nonce error - Please refresh and try again';
  }
  
  // Generic fallback - try to extract meaningful part
  const reasonMatch = errorString.match(/reason="([^"]+)"/);
  if (reasonMatch) {
    return `⚠️ ${reasonMatch[1]}`;
  }
  
  const messageMatch = errorString.match(/message":"([^"]+)"/);
  if (messageMatch) {
    return `⚠️ ${messageMatch[1]}`;
  }
  
  // If error is too long, truncate it
  if (errorString.length > 100) {
    return '⚠️ Transaction failed - Please try again or contact support';
  }
  
  return errorString;
};
