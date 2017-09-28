const appFilters = angular.module('appFilters', []);

appFilters.filter('symbolize', () => {
    const map: IStringMap = {
        active: '✓',
    };

    return (value: string) => {
        return map[value] || '';
    };
});

export default appFilters;
