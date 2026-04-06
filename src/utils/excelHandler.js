import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Parses an Excel file and returns a JSON representation of the first sheet.
 * @param {File} file - The Excel file to parse.
 * @returns {Promise<Array>} - A promise that resolves to an array of objects.
 */
export const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                console.log('📦 Raw Excel Sheet JSON:', jsonData);
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Validates if the required columns are present in the parsed data.
 * @param {Array} data - The parsed JSON data.
 * @param {Array} requiredColumns - List of required column names.
 * @returns {Boolean}
 */
export const validateExcelColumns = (data, requiredColumns) => {
    if (!data || data.length === 0) return false;
    const firstRow = data[0];
    return requiredColumns.every(col => col in firstRow);
};

/**
 * Exports data to an Excel file with PREMIUM STYLING using ExcelJS.
 * @param {Array} data - The data to export.
 * @param {string} filename - The name of the file to save.
 */
export const exportToExcel = async (data, filename = 'export.xlsx') => {
    if (!data || data.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Maintenance Report');

    // Get columns from the first object
    const columns = Object.keys(data[0]);
    
    // Setup Column headers
    worksheet.columns = columns.map(col => ({
        header: col,
        key: col,
        width: Math.max(col.length, 12) // initial width
    }));

    // Add Data
    worksheet.addRows(data);

    // --- STYLING ---

    // 1. Header Styling
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E293B' }, // Slate-800
        };
        cell.font = {
            name: 'Arial',
            size: 11,
            bold: true,
            color: { argb: 'FFFFFFFF' } // White
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });
    headerRow.height = 25;

    // 2. Data Row Styling & Conditional Formatting
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // skip header

        // Zebra striping
        if (rowNumber % 2 === 0) {
            row.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF8FAFC' } // Slate-50
                };
            });
        }

        row.eachCell((cell, colNumber) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

            // SLA Status Highlighting
            const headerName = worksheet.columns[colNumber - 1].header;
            if (headerName.toUpperCase().includes('SLA') || headerName.toUpperCase().includes('STATUS')) {
                const val = cell.value?.toString().toUpperCase();
                if (val === 'MEET') {
                    cell.font = { bold: true, color: { argb: 'FF059669' } }; // Emerald-600
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
                } else if (val === 'MISS') {
                    cell.font = { bold: true, color: { argb: 'FFDC2626' } }; // Red-600
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
                }
            }
        });
    });

    // 3. Auto-adjust columns width
    worksheet.columns.forEach(column => {
        let maxColumnLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 0;
            if (columnLength > maxColumnLength) {
                maxColumnLength = columnLength;
            }
        });
        column.width = Math.min(Math.max(maxColumnLength + 2, 12), 50); // Min 12, Max 50
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
};
