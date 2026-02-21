import { describe, it, expect } from 'vitest';
import { findSimilarTransactions } from '../lib/sourceUtils';
import { Transaction } from '../components/Transactions/hooks/useTransactionTable';

const mockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: '1',
    user_id: 'user-1',
    date: '2023-01-01',
    source: 'Test Merchant',
    clean_source: '',
    amount: -100,
    account: 'Master',
    status: 'Pending Triage',
    budget: 'Budgeted',
    category: 'Other',
    sub_category: null,
    planned: false,
    recurring: 'N/A',
    description: null,
    ...overrides
});

describe('findSimilarTransactions', () => {
    const currentTx = mockTransaction({ id: 'base', source: 'Spotify Ab', amount: -99, clean_source: 'Spotify' });

    const allTxs = [
        mockTransaction({ id: '1', source: 'Spotify Ab', amount: -99 }), // Exact Match + Amount
        mockTransaction({ id: '2', source: 'Spotify Premium', amount: -149 }), // Partial Match
        mockTransaction({ id: '3', source: 'Netto', amount: -99 }), // Amount Match Only
        mockTransaction({ id: '4', source: 'Unknown', amount: -500 }), // No Match
        mockTransaction({ id: '5', source: 'SPTFY', amount: -99 }), // No string match, but maybe should fuzzy? (Current logic won't catch this without fuzzy lib)
    ];

    it('should prioritize exact name matches', () => {
        const results = findSimilarTransactions(currentTx, allTxs, 'Spotify Ab');
        expect(results[0].transaction.id).toBe('1');
        expect(results[0].matchType).toBe('exact_name');
    });

    it('should find partial matches', () => {
        const results = findSimilarTransactions(currentTx, allTxs, 'Spotify');
        // id 1: "Spotify Ab" includes "Spotify" -> contains_name
        // id 2: "Spotify Premium" includes "Spotify" -> contains_name

        const spotifyPremium = results.find(r => r.transaction.id === '2');
        expect(spotifyPremium).toBeDefined();
        expect(spotifyPremium?.matchType).toBe('contains_name');
    });

    it('should include strict amount matches with lower score', () => {
        const results = findSimilarTransactions(currentTx, allTxs, 'SomethingElse');
        // "SomethingElse" matches nothing by name.
        // id 1 (Spotify Ab, -99) matches amount 99.

        const amountMatch = results.find(r => r.transaction.id === '3');
        expect(amountMatch).toBeDefined();
        expect(amountMatch?.matchType).toBe('amount_similarity');
        expect(amountMatch?.score).toBeLessThan(60); // Lower than name matches
    });

    it('should exclude irrelevant transactions', () => {
        const results = findSimilarTransactions(currentTx, allTxs, 'Spotify');
        const unknown = results.find(r => r.transaction.id === '4');
        expect(unknown).toBeUndefined();
    });
});
