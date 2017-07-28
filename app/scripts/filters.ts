const appFilters = angular.module('appFilters', []);

appFilters.filter('symbolize', () => {
    const map = {
        active: '✓',
    };

    return (value) => {
        return map[value] || '';
    };
});
