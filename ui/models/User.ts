import m from 'mithril';

export interface Settings {
    [name: string]: string | boolean | undefined;
}

export interface Service {
    readonly label: string;
    readonly persist: boolean;
    readonly key: string;
    readonly value?: string | boolean;
}

export interface UserFields {
    password?: string;
    persist: boolean;
    username?: string;
    errorMessage?: string;
    successMessage?: string;
    settings?: Settings;
}

const currentUser: UserFields = {
    errorMessage: undefined,
    successMessage: undefined,
    password: undefined,
    persist: false,
    username: undefined,
    settings: {
        webhook: undefined,
    },
};

let loginUnderway = false;

export default {
    current: currentUser,

    discardCookie() {
        console.log('discarding token cookie');
        document.cookie = `token=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    },

    getServices() {
        m.request({
            body: currentUser,
            method: 'GET',
            url: 'services',
            withCredentials: true,
        }).then((services: Service[]) => {
            for (const service of services) {
                currentUser.settings![service.key] = service.value;
            }
        }).catch((e) => {
            if (e.code === 401) {
                this.discardCookie();
            }
        });
    },

    hasErrorMessage(): boolean {
        return currentUser.errorMessage !== undefined;
    },

    hasNoErrorMessage(): boolean {
        return !this.hasErrorMessage();
    },

    hasSuccessMessage(): boolean {
        return currentUser.successMessage !== undefined;
    },

    hasNoSuccessMessage(): boolean {
        return !this.hasSuccessMessage();
    },

    isLoggedIn(): boolean {
        const allCookies = document.cookie.split(';');
        const tokenCookie = allCookies.filter((cookie: string) => cookie.startsWith('token='));
        return tokenCookie.length === 1;
    },

    isLoggingIn(): boolean {
        return loginUnderway;
    },

    isNotLoggingIn(): boolean {
        return !this.isLoggingIn();
    },

    isLoggedOut(): boolean {
        return !this.isLoggedIn();
    },

    logIn() {
        if (this.isLoggedIn()) {
            return;
        }

        loginUnderway = true;

        m.request({
            body: currentUser,
            method: 'POST',
            url: 'auth',
            withCredentials: true,
        }).then((_) => {
            loginUnderway = false;
            m.route.set('/');
        }).catch(() => {
            loginUnderway = false;
            currentUser.errorMessage = 'Please try again.';
        });
    },

    loginUnderway: false,

    logOut() {
        if (this.isLoggedOut()) {
            return;
        }

        m.request({
            background: true,
            method: 'POST',
            url: 'deauth',
            withCredentials: true,
        }).then(() => {
            currentUser.password = undefined;
            currentUser.persist = false;
            currentUser.username = undefined;
        }).catch((e: Error) => {
            if (e.code === 401) {
                this.discardCookie();
            }
        });
    },

    saveServices(data: FormData) {
        m.request({
            body: Object.fromEntries(data),
            method: 'POST',
            url: 'services',
            withCredentials: true,
        }).then(() => {
            currentUser.successMessage = 'Settings saved.';
        }).catch(() => {
            currentUser.errorMessage = 'Please try again.';
        });
    },
};
