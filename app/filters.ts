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

    return (value: Date, remaining?: number) => {
        const now = new Date();
        const referenceDate = startOfDay(value);
        const currentDate = startOfDay(now);

        const delta = referenceDate.getTime() - currentDate.getTime();

        const days = delta / 86400000;

        if (days === 0) {
            if (remaining) {
                if (remaining === 1) {
                    return 'in 1 second';
                }

                if (remaining < 11) {
                    return `in ${remaining} seconds`;
                }

                const minutes = Math.ceil(remaining / 60);

                if (minutes === 1) {
                    return 'in 1 minutes';
                }

                if (minutes < 60) {
                    return `in ${minutes} minutes`;
                }

                const hours = Math.ceil(remaining / 3600);

                if (hours === 1) {
                    return 'in 1 hour';
                }

                return `in ${hours} hours`;
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
