/**
 * Contract Error Messages
 * Maps custom error names from MessageContract.sol to user-friendly messages
 */

export const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  // Pause errors
  'ContractPaused()': '⏸️ The messaging system is temporarily paused for maintenance. Please try again later.',
  
  // Authorization errors
  'UnauthorizedSender()': '🚫 You are not authorized to send messages as this user.',
  'UnauthorizedUser()': '🚫 You can only initialize your own account.',
  'UnauthorizedParticipantAdd()': '🚫 Only conversation participants can invite others.',
  'NotParticipant()': '🚫 You are not a member of this conversation.',
  'NotRecipient()': '🚫 You are not the recipient of this message.',
  
  // Validation errors
  'InvalidKeyRegistry()': '❌ Invalid key registry configuration. Please contact support.',
  'InvalidRelayerAddress()': '❌ Invalid relayer address.',
  'InvalidUserAddress()': '❌ Invalid user address.',
  'InvalidCID()': '❌ Invalid content identifier. Please try again.',
  'InvalidParticipantAddress()': '❌ Invalid participant address.',
  'InvalidMessageIndex()': '❌ Invalid message index.',
  'InvalidMessageId()': '❌ Invalid message ID.',
  
  // State errors
  'UserAlreadyInitialized()': 'ℹ️ This account is already initialized.',
  'UserNotInitialized()': '⚠️ Please initialize your account before continuing.',
  'SenderNotInitialized()': '⚠️ Please initialize your account before sending messages.',
  'KeyNotRegistered()': '🔑 Please register your encryption key first. Go to Key Management.',
  'ParticipantAlreadyInThread()': 'ℹ️ This user is already in the conversation.',
  
  // Thread errors
  'ThreadHasNoMessages()': '📭 This conversation has no messages yet.',
  'MessageIndexOutOfBounds()': '❌ Message index is out of range.',
  'MessageDoesNotExist()': '❌ This message does not exist.',
  'CannotReadBeforeJoinTime()': '⏰ You can only read messages from when you joined this conversation.',
  'CannotMoveReadIndexBackward()': '⏪ Cannot mark older messages as the latest read.',
};

/**
 * Extract custom error name from error object
 */
export function extractErrorName(error: any): string {
  const errorString = error.reason || error.message || error.data?.message || '';
  
  // Match custom error format: "ErrorName()"
  const match = errorString.match(/(\w+)\(\)/);
  return match ? match[0] : '';
}

/**
 * Get user-friendly error message from contract error
 */
export function getContractErrorMessage(error: any): string {
  // Extract custom error name
  const errorName = extractErrorName(error);
  
  // Return mapped message if available
  if (errorName && CONTRACT_ERROR_MESSAGES[errorName]) {
    return CONTRACT_ERROR_MESSAGES[errorName];
  }
  
  // Handle common ethers.js errors
  if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
    return '❌ Transaction was cancelled.';
  }
  
  if (error.code === 'INSUFFICIENT_FUNDS' || error.code === -32000) {
    return '💰 Insufficient funds to complete transaction.';
  }
  
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return '🌐 Network error. Please check your connection and try again.';
  }
  
  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return '⛽ Unable to estimate gas. Transaction may fail.';
  }
  
  if (error.code === 'NONCE_EXPIRED') {
    return '🔄 Transaction nonce expired. Please try again.';
  }
  
  // Check for "already known" transaction
  if (error.message?.includes('already known') || error.code === -32603) {
    return '⏳ Transaction already pending. Please wait for confirmation.';
  }
  
  // Generic fallback
  return '❌ Transaction failed. Please try again.';
}

/**
 * Check if error is a specific custom error
 */
export function isCustomError(error: any, errorName: string): boolean {
  const extracted = extractErrorName(error);
  return extracted === `${errorName}()`;
}

/**
 * Check if contract is paused
 */
export function isContractPaused(error: any): boolean {
  return isCustomError(error, 'ContractPaused');
}

/**
 * Check if user needs to register key
 */
export function needsKeyRegistration(error: any): boolean {
  return isCustomError(error, 'KeyNotRegistered');
}

/**
 * Check if user needs initialization
 */
export function needsInitialization(error: any): boolean {
  return isCustomError(error, 'UserNotInitialized') || 
         isCustomError(error, 'SenderNotInitialized');
}

/**
 * Contract Error Handler Class
 * Centralized error handling with logging and user feedback
 */
export class ContractErrorHandler {
  /**
   * Handle contract error and return user-friendly message
   */
  static handle(error: any, context?: string): string {
    // Log error for debugging
    if (context) {
      console.error(`Contract error in ${context}:`, error);
    } else {
      console.error('Contract error:', error);
    }
    
    // Get user-friendly message
    return getContractErrorMessage(error);
  }
  
  /**
   * Handle error with automatic UI feedback
   */
  static handleWithFeedback(
    error: any, 
    context: string,
    onError: (message: string) => void
  ): void {
    const message = this.handle(error, context);
    onError(message);
    
    // Additional actions based on error type
    if (isContractPaused(error)) {
      console.warn('⏸️ Contract is paused. Operations are temporarily disabled.');
    }
    
    if (needsKeyRegistration(error)) {
      console.warn('🔑 User needs to register encryption key.');
    }
    
    if (needsInitialization(error)) {
      console.warn('⚠️ User needs to initialize account.');
    }
  }
}
