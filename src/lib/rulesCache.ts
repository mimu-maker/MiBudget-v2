import type { MerchantRule } from '@/lib/importBrain';

const RULES_CACHE_KEY = 'merchant_rules_cache_v1';

export interface CachedRulesSnapshot {
    timestamp: number;
    rules: MerchantRule[];
}

export const saveRulesCache = (rules: MerchantRule[]): CachedRulesSnapshot | null => {
    try {
        const payload: CachedRulesSnapshot = {
            timestamp: Date.now(),
            rules
        };
        localStorage.setItem(RULES_CACHE_KEY, JSON.stringify(payload));
        return payload;
    } catch (error) {
        console.warn('Failed to persist merchant rules cache', error);
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
        console.warn('Failed to read merchant rules cache', error);
        return null;
    }
};
