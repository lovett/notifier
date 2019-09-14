import m from 'mithril';

interface UserFields {
    password?: string;
    persist: boolean;
    username?: string;
    message?: string;
}

const currentUser: UserFields = {
    message: undefined,
    password: undefined,
    persist: false,
    username: undefined,
};

let loginUnderway = false;

export default {
    current: currentUser,

    hasMessage(): boolean {
        return currentUser.message !== undefined;
    },

    hasNoMessage(): boolean {
        return !this.hasMessage();
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
        }).catch((_: Event) => {
            loginUnderway = false;
            currentUser.message = 'Please try again.';
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
        }).catch((e: Event) => {
            console.log(e);
        });
    },
};
