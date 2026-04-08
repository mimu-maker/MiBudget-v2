import type { ClassificationRule } from '@/lib/importBrain';

// Clear stale cache on upgrade
localStorage.removeItem('source_rules_cache_v1');

const RULES_CACHE_KEY = 'classification_rules_cache_v2';

export interface CachedRulesSnapshot {
    timestamp: number;
    rules: ClassificationRule[];
}

export const saveRulesCache = (rules: ClassificationRule[]): CachedRulesSnapshot | null => {
    try {
        const payload: CachedRulesSnapshot = {
            timestamp: Date.now(),
            rules
        };
        localStorage.setItem(RULES_CACHE_KEY, JSON.stringify(payload));
        return payload;
    } catch (error) {
        console.warn('Failed to persist source rules cache', error);
        return null;
    }
};

export const getCachedRules = (): CachedRulesSnapshot | null => {
    try {
        const raw = localStorage.getItem(RULES_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedRulesSnapshot;
        if (!parsed?.rules) return null;
        return parsed;
    } catch (error) {
        console.warn('Failed to read source rules cache', error);
        return null;
    }
};
