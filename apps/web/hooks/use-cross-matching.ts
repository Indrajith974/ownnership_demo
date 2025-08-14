// React hook for cross-matching functionality
import { useState, useCallback } from 'react';
import type {
  FingerprintMatchRequest,
  CrossMatchResponse,
  BatchMatchRequest,
  BatchMatchResponse,
  MatchingConfig
} from '@/types/cross-matching';

interface UseCrossMatchingReturn {
  // State
  isChecking: boolean;
  lastResult: CrossMatchResponse | null;
  error: string | null;
  
  // Actions
  checkFingerprint: (request: FingerprintMatchRequest) => Promise<CrossMatchResponse>;
  checkBatch: (request: BatchMatchRequest) => Promise<BatchMatchResponse>;
  clearResults: () => void;
  
  // Utilities
  isOriginal: boolean;
  isDuplicate: boolean;
  isSimilar: boolean;
  shouldProceed: boolean;
  warningMessage: string | null;
}

export function useCrossMatching(): UseCrossMatchingReturn {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<CrossMatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkFingerprint = useCallback(async (
    request: FingerprintMatchRequest
  ): Promise<CrossMatchResponse> => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch('/api/checkFingerprintMatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Cross-matching failed');
      }

      const result: CrossMatchResponse = await response.json();
      setLastResult(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Return a default "original" result on error
      const fallbackResult: CrossMatchResponse = {
        status: 'original',
        isOriginal: true,
        matches: [],
        totalMatches: 0,
        processingTime: 0,
        recommendations: {
          shouldProceed: true,
          warningMessage: `Unable to verify originality: ${errorMessage}`
        }
      };
      
      setLastResult(fallbackResult);
      return fallbackResult;

    } finally {
      setIsChecking(false);
    }
  }, []);

  const checkBatch = useCallback(async (
    request: BatchMatchRequest
  ): Promise<BatchMatchResponse> => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch('/api/checkFingerprintMatch', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Batch cross-matching failed');
      }

      const result: BatchMatchResponse = await response.json();
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;

    } finally {
      setIsChecking(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);

  // Computed properties
  const isOriginal = lastResult?.status === 'original';
  const isDuplicate = lastResult?.status === 'duplicate';
  const isSimilar = lastResult?.status === 'similar';
  const shouldProceed = lastResult?.recommendations?.shouldProceed ?? true;
  const warningMessage = lastResult?.recommendations?.warningMessage ?? null;

  return {
    // State
    isChecking,
    lastResult,
    error,
    
    // Actions
    checkFingerprint,
    checkBatch,
    clearResults,
    
    // Utilities
    isOriginal,
    isDuplicate,
    isSimilar,
    shouldProceed,
    warningMessage
  };
}

// Hook for cross-matching configuration
interface UseCrossMatchingConfigReturn {
  config: MatchingConfig;
  updateConfig: (newConfig: Partial<MatchingConfig>) => void;
  resetConfig: () => void;
}

const DEFAULT_CONFIG: MatchingConfig = {
  exactMatchEnabled: true,
  nearMatchEnabled: true,
  hammingThreshold: 10,
  confidenceThreshold: 70,
  maxResults: 50,
  enableMetadataMatching: true
};

export function useCrossMatchingConfig(): UseCrossMatchingConfigReturn {
  const [config, setConfig] = useState<MatchingConfig>(DEFAULT_CONFIG);

  const updateConfig = useCallback((newConfig: Partial<MatchingConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  return {
    config,
    updateConfig,
    resetConfig
  };
}

// Hook for managing duplicate alerts
interface UseDuplicateAlertsReturn {
  alerts: any[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  fetchAlerts: () => Promise<void>;
  markAsRead: (alertId: string) => Promise<void>;
  dismissAlert: (alertId: string) => Promise<void>;
  clearAllAlerts: () => Promise<void>;
}

export function useDuplicateAlerts(userIdentifier?: string): UseDuplicateAlertsReturn {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!userIdentifier) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/duplicateAlerts?user=${encodeURIComponent(userIdentifier)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch duplicate alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts || []);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);

    } finally {
      setIsLoading(false);
    }
  }, [userIdentifier]);

  const markAsRead = useCallback(async (alertId: string) => {
    try {
      const response = await fetch(`/api/duplicateAlerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ acknowledged: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark alert as read');
      }

      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ));

    } catch (err) {
      console.error('Error marking alert as read:', err);
    }
  }, []);

  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      const response = await fetch(`/api/duplicateAlerts/${alertId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss alert');
      }

      setAlerts(prev => prev.filter(alert => alert.id !== alertId));

    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  }, []);

  const clearAllAlerts = useCallback(async () => {
    if (!userIdentifier) return;

    try {
      const response = await fetch(`/api/duplicateAlerts?user=${encodeURIComponent(userIdentifier)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear all alerts');
      }

      setAlerts([]);

    } catch (err) {
      console.error('Error clearing all alerts:', err);
    }
  }, [userIdentifier]);

  const unreadCount = alerts.filter(alert => !alert.acknowledged).length;

  return {
    alerts,
    unreadCount,
    isLoading,
    error,
    fetchAlerts,
    markAsRead,
    dismissAlert,
    clearAllAlerts
  };
}
