import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface BackupData {
    version: string;
    timestamp: string;
    profile: any;
    settings: any;
    categories: any[];
    subCategories: any[];
    accounts: any[];
    sources: any[];
    sourceRules: any[];
    transactions: any[];
    projections: any[];
}

/**
 * Gathers all user data into a single JSON object for backup
 */
export async function generateBackupData(userId: string): Promise<BackupData> {
    const backup: BackupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        profile: null,
        settings: null,
        categories: [],
        subCategories: [],
        accounts: [],
        sources: [],
        sourceRules: [],
        transactions: [],
        projections: [],
    };

    try {
        // 1. Profile & Settings
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
        backup.profile = profile;

        // 2. Categories
        const { data: categories } = await supabase.from('categories').select('*').eq('user_id', userId);
        if (categories) {
            backup.categories = categories;
            const categoryIds = (categories as any[]).map(c => c.id);
            if (categoryIds.length > 0) {
                const { data: subCategories } = await supabase.from('sub_categories').select('*').in('category_id', categoryIds);
                backup.subCategories = subCategories || [];
            }
        }

        // 3. Accounts
        const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', userId);
        backup.accounts = accounts || [];

        // 4. Sources & Rules
        const { data: sources } = await supabase.from('sources').select('*').eq('user_id', userId);
        backup.sources = sources || [];

        const { data: sourceRules } = await supabase.from('source_rules').select('*').eq('user_id', userId);
        backup.sourceRules = sourceRules || [];

        // 5. Transactions
        const { data: transactions } = await supabase.from('transactions').select('*').eq('user_id', userId);
        backup.transactions = transactions || [];

        // 6. Projections
        const { data: projections } = await supabase.from('projections').select('*').eq('user_id', userId);
        backup.projections = projections || [];

        return backup;
    } catch (err) {
        console.error("Failed to gather backup data:", err);
        throw new Error("Could not assemble backup data from database.");
    }
}

/**
 * Standard browser download mechanism as a fallback or primary option
 */
export function downloadBackupFile(backupData: BackupData) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);

    // Format: MiBudget_Backup_YYYY-MM-DD.json
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    downloadAnchorNode.setAttribute("download", `MiBudget_Backup_${dateStr}.json`);

    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

/**
 * Uses Google Picker / Drive API to save the generated JSON.
 * Requires an active Google OAuth token with Drive scopes.
 */
export async function uploadToGoogleDrive(backupData: BackupData, accessToken: string) {
    // We construct a multipart upload to set both metadata (name) and the file content
    const metadata = {
        name: `MiBudget_Backup_${format(new Date(), 'yyyy-MM-dd')}.json`,
        mimeType: 'application/json',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(backupData, null, 2) +
        close_delim;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error("Google Drive Upload Error:", errorText);
        throw new Error("Failed to upload to Google Drive");
    }

    return await res.json();
}
