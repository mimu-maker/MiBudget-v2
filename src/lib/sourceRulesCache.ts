import type { SourceRule } from '@/lib/importBrain';

const RULES_CACHE_KEY = 'source_rules_cache_v1';

export interface CachedRulesSnapshot {
    timestamp: number;
    rules: SourceRule[];
}

export const saveRulesCache = (rules: SourceRule[]): CachedRulesSnapshot | null => {
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
