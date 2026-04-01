import * as XLSX from 'xlsx';

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
 * Exports data to an Excel file.
 * @param {Array} data - The data to export.
 * @param {string} filename - The name of the file to save.
 */
export const exportToExcel = (data, filename = 'export.xlsx') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, filename);
};

