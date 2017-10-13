const appFilters = angular.module('appFilters', []);

appFilters.filter('symbolize', () => {
    const map: app.StringMap = {
        active: '✓',
    };

    return (value: string) => {
        return map[value] || '';
    };
});

appFilters.filter('reldate', (dateFilter: angular.IFilterDate) => {

    function startOfDay(value: Date) {
        const d = new Date(value.getTime());
        d.setHours(0, 0, 0, 0);

        return d;
    }

    function labelAndTime(label: string, value: Date) {
        const t = dateFilter(value, 'h:mm a');
        return `${t} ${label}`;
    }

    return (value: Date, minutesRemaining?: number) => {
        const now = new Date();
        const referenceDate = startOfDay(value);
        const currentDate = startOfDay(now);

        const delta = referenceDate.getTime() - currentDate.getTime();

        const days = delta / 86400000;

        if (days === 0) {
            if (minutesRemaining && minutesRemaining > 1 && minutesRemaining < 60) {
                return `in ${minutesRemaining} minutes`;
            }

            return labelAndTime('today', value);
        }

        if (days === -1) {
            return labelAndTime('yesterday', value);
        }

        if (days === 1) {
            return labelAndTime('tomorrow', value);
        }

        return dateFilter(value, 'EEEE MMMM d');
    };
});

export default appFilters;
