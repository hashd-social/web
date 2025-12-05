import { ethers } from 'ethers';

export interface SessionDurationOption {
  id: string;
  label: string;
  minutes: number;
  hours: number;
  description: string;
}

// Base cost calculation for HASHD
// Estimated cost per message send: ~0.000002 ETH
const BASE_MESSAGE_COST_ETH = 0.000002;
const BASE_MESSAGES_PER_DAY = 50; // Conservative estimate for email usage
const BASE_DAILY_COST_ETH = BASE_MESSAGE_COST_ETH * BASE_MESSAGES_PER_DAY;
const SAFETY_MULTIPLIER = 1.5; // 50% safety buffer

export const SESSION_DURATION_OPTIONS: SessionDurationOption[] = [
  {
    id: 'quick-15',
    label: '15 Minutes',
    minutes: 15,
    hours: 0.25,
    description: 'Quick testing session'
  },
  {
    id: 'short',
    label: '1 Hour',
    minutes: 60,
    hours: 1,
    description: 'Short active session'
  },
  {
    id: 'medium',
    label: '6 Hours',
    minutes: 360,
    hours: 6,
    description: 'Perfect for active use'
  },
  {
    id: 'half-day',
    label: '12 Hours',
    minutes: 720,
    hours: 12,
    description: 'Great for extended use'
  },
  {
    id: 'daily',
    label: '1 Day',
    minutes: 1440,
    hours: 24,
    description: 'Full day convenience'
  },
  {
    id: 'weekly',
    label: '7 Days',
    minutes: 10080,
    hours: 168,
    description: 'Week-long convenience'
  }
];

export const getSessionDurationById = (id: string): SessionDurationOption | undefined => {
  return SESSION_DURATION_OPTIONS.find(option => option.id === id);
};

export const getDefaultSessionDuration = (): SessionDurationOption => {
  return SESSION_DURATION_OPTIONS[1]; // 1 Hour as default
};

// Calculate messages for session duration with proper min/max bounds
const calculateMessagesForDuration = (durationMinutes: number): number => {
  // Set min/max bounds: 15 minutes = 5 messages, 7 days = 200 messages
  const MIN_MESSAGES = 5; // 15 minutes minimum
  const MAX_MESSAGES = 200; // 7 days maximum
  
  // Linear interpolation between min and max
  const minDurationMinutes = 15; // 15 minutes
  const maxDurationMinutes = 7 * 24 * 60; // 7 days in minutes
  
  // Calculate ratio of current duration between min and max
  const durationRatio = Math.min(1, Math.max(0, 
    (durationMinutes - minDurationMinutes) / (maxDurationMinutes - minDurationMinutes)
  ));
  
  // Interpolate between min and max messages
  const messages = MIN_MESSAGES + (MAX_MESSAGES - MIN_MESSAGES) * durationRatio;
  
  return Math.round(messages);
};

// Calculate session funding based on duration and real-time costs
export const calculateSessionFunding = async (durationMinutes: number, realTimeMessageCost?: number): Promise<string> => {
  // Use real-time cost if available, otherwise fall back to base cost
  const messageCostETH = realTimeMessageCost || BASE_MESSAGE_COST_ETH;
  
  // Calculate messages for this duration using proper bounds
  const messagesForDuration = calculateMessagesForDuration(durationMinutes);
  
  // Calculate total cost with safety buffer
  const baseCost = messageCostETH * messagesForDuration;
  const totalCost = baseCost * SAFETY_MULTIPLIER;
  
  // Format to appropriate decimal places
  return totalCost.toFixed(8);
};

// Get session funding with real-time cost calculation
export const getSessionFunding = async (durationMinutes: number): Promise<string> => {
  // For now, use base cost calculation
  // In the future, we could implement real-time cost detection similar to Hashd
  return calculateSessionFunding(durationMinutes);
};
