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
    errorMessage: string;
    successMessage: string;
    settings: Settings;
}

const currentUser: UserFields = {
    errorMessage: '',
    successMessage: '',
    password: '',
    persist: false,
    username: '',
    settings: {
        webhook: '',
    },
};

let loginUnderway = false;

export default {
    current: currentUser,

    clearMessages(): void {
        currentUser.errorMessage = '';
        currentUser.successMessage = '';
    },

    discardCookie(): void {
        // biome-ignore lint/suspicious/noDocumentCookie: Old browser support
        document.cookie =
            'token=;path=/;SameSite=Strict;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    },

    getServices(): void {
        m.request({
            body: currentUser,
            method: 'GET',
            url: 'services',
            withCredentials: true,
        })
            .then((services: unknown) => {
                for (const service of services as Service[]) {
                    currentUser.settings[service.key] = service.value;
                }
            })
            .catch((e) => {
                if (e.code === 401) {
                    this.discardCookie();
                }
            });
    },

    hasErrorMessage(): boolean {
        return currentUser.errorMessage !== '';
    },

    hasNoErrorMessage(): boolean {
        return !this.hasErrorMessage();
    },

    hasSuccessMessage(): boolean {
        return currentUser.successMessage !== '';
    },

    hasNoSuccessMessage(): boolean {
        return !this.hasSuccessMessage();
    },

    isLoggedIn(): boolean {
        const allCookies = document.cookie.split(';');
        const tokenCookie = allCookies.filter((cookie: string) =>
            cookie.startsWith('token='),
        );
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

    logIn(): void {
        if (this.isLoggedIn()) {
            return;
        }

        loginUnderway = true;

        m.request({
            body: currentUser,
            method: 'POST',
            url: 'auth',
            withCredentials: true,
        })
            .then(() => {
                loginUnderway = false;
                currentUser.errorMessage = '';
                m.route.set('/');
            })
            .catch(() => {
                loginUnderway = false;
                currentUser.errorMessage = 'Please try again.';
            });
    },

    loginUnderway: false,

    logOut(): void {
        if (this.isLoggedOut()) {
            return;
        }

        m.request({
            background: true,
            method: 'POST',
            url: 'deauth',
            withCredentials: true,
        }).finally(() => {
            currentUser.password = '';
            currentUser.persist = false;
            currentUser.username = '';
            this.discardCookie();
        });
    },

    saveServices(data: FormData): void {
        const settings = Object.fromEntries(data) as Settings;
        m.request({
            body: settings,
            method: 'POST',
            url: 'services',
            withCredentials: true,
        })
            .then(() => {
                currentUser.successMessage = 'Settings saved.';
                currentUser.settings = settings;
            })
            .catch(() => {
                currentUser.errorMessage = 'Please try again.';
            });
    },
};
