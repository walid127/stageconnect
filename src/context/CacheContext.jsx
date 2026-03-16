import { createContext, useContext, useState, useCallback } from 'react';

const CacheContext = createContext();

// Durée d'expiration du cache : 2 minutes
const DUREE_CACHE = 2 * 60 * 1000;

export function CacheProvider({ children }) {
    const [cache, setCache] = useState({});

    const getCachedData = useCallback((key) => {
        const cached = cache[key];
        if (!cached) return null;

        const maintenant = Date.now();
        if (maintenant - cached.timestamp > DUREE_CACHE) {
            // Cache expiré
            return null;
        }

        return cached.data;
    }, [cache]);

    const setCachedData = useCallback((key, data) => {
        setCache(prev => ({
            ...prev,
            [key]: {
                data,
                timestamp: Date.now()
            }
        }));
    }, []);

    const clearCache = useCallback((key) => {
        if (key) {
            setCache(prev => {
                const newCache = { ...prev };
                delete newCache[key];
                return newCache;
            });
        } else {
            setCache({});
        }
    }, []);

    return (
        <CacheContext.Provider value={{ getCachedData, setCachedData, clearCache }}>
            {children}
        </CacheContext.Provider>
    );
}

export function useCache() {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within CacheProvider');
    }
    return context;
}






