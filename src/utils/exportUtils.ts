import { Transaction } from '../components/Transactions/hooks/useTransactionTable';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export const exportTransactions = (transactions: Transaction[], formatType: ExportFormat) => {
    const exportData = transactions.map(t => ({
        Date: format(new Date(t.date), 'yyyy-MM-dd'),
        Description: t.description || t.source || '',
        Amount: t.amount,
        Status: t.status || '',
        Category: t.category || '',
        'Sub-category': t.sub_category || '',
        Excluded: t.excluded ? 'Yes' : 'No',
        Planned: t.planned ? 'Yes' : 'No',
    }));

    const filename = `Transactions_Export_${format(new Date(), 'yyyyMMdd_HHmmss')}`;

    switch (formatType) {
        case 'csv': {
            const csv = Papa.unparse(exportData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('url');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            break;
        }
        case 'excel': {
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
            XLSX.writeFile(workbook, `${filename}.xlsx`);
            break;
        }
        case 'pdf': {
            const doc = new jsPDF('landscape');

            doc.setFontSize(16);
            doc.text('Transactions Export', 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, 22);

            const tableColumn = Object.keys(exportData[0] || {});
            const tableRows = exportData.map(row => Object.values(row).map(val => String(val)));

            (doc as any).autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 28,
                theme: 'striped',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185] },
            });

            doc.save(`${filename}.pdf`);
            break;
        }
    }
};
