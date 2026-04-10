export const getIsoDate = (raw) => {
    try {
        if (!raw) return null;

        const toLocalIso = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (raw instanceof Date) {
            if (isNaN(raw.getTime())) return null;
            return toLocalIso(raw);
        }

        const str = raw.toString().trim();

        const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (slashMatch) {
            const day = slashMatch[1].padStart(2, '0');
            const month = slashMatch[2].padStart(2, '0');
            const year = slashMatch[3];
            return `${year}-${month}-${day}`;
        }

        const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (dashMatch) {
            const day = dashMatch[1].padStart(2, '0');
            const month = dashMatch[2].padStart(2, '0');
            const year = dashMatch[3];
            return `${year}-${month}-${day}`;
        }

        const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            return isoMatch[0];
        }

        const num = Number(str);
        if (!isNaN(num) && num > 40000 && num < 60000) {
            const excelEpoch = new Date(1899, 11, 30);
            const d = new Date(excelEpoch.getTime() + num * 86400000);
            return toLocalIso(d);
        }

        const d = new Date(str);
        if (!isNaN(d.getTime())) return toLocalIso(d);

        return null;
    } catch (e) { return null; }
};

export const formatDate = (iso) => {
    if (!iso) return '---';
    if (typeof iso !== 'string') return '---';
    const parts = iso.split('-');
    if (parts.length >= 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2].slice(0, 2);
        return `${day}/${month}/${year}`;
    }
    return iso;
};

export const getPerformanceStatus = (task) => {
    if (!task.scheduled_date) return 'ON PROGRESS';

    const scheduled = new Date(task.scheduled_date);
    const completed = task.completed_date ? new Date(task.completed_date) : null;
    const now = new Date();

    const taskMonthYear = scheduled.getFullYear() * 12 + scheduled.getMonth();
    const currentMonthYear = now.getFullYear() * 12 + now.getMonth();
    const isPastMonth = taskMonthYear < currentMonthYear;

    if (!completed) {
        return isPastMonth ? 'MISS' : 'ON PROGRESS';
    }

    const diffInDays = Math.floor(Math.abs(completed - scheduled) / (1000 * 60 * 60 * 24));
    const completedMonthYear = completed.getFullYear() * 12 + completed.getMonth();
    if (completedMonthYear > taskMonthYear) return 'MISS';

    return diffInDays <= 7 ? 'MEET' : 'MISS';
};
