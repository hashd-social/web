// Simple in-memory cache for group data to avoid slow RPC calls
interface CachedGroupData {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CachedGroupData>();
const CACHE_DURATION = 30000; // 30 seconds

export const groupCache = {
  get(key: string): any | null {
    const cached = cache.get(key);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_DURATION) {
      cache.delete(key);
      return null;
    }
    
    return cached.data;
  },
  
  set(key: string, data: any): void {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },
  
  clear(): void {
    cache.clear();
  },
  
  clearGroup(groupAddress: string): void {
    // Clear all keys related to this group
    const keys = Array.from(cache.keys());
    keys.forEach(key => {
      if (key.includes(groupAddress)) {
        cache.delete(key);
      }
    });
  }
};
