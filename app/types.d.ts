declare namespace app {
    type ServiceCallback = (services: any) => void;

    type WebhookSubmissionCallback = (successfuly: boolean) => void;

    interface RawMessage {
        title: string;
        body?: string;
        url?: string;
        publicId: string;
        group: string;
        received: string;
        expiresAt?: string;
        stage: string;
    }

    class Message {
        public static fromRaw(message: app.RawMessage): Message;
        public active: boolean;
        public title: string;
        public body?: string;
        public group: string;
        public publicId: string;
        public received: Date;
        public url?: string;
        public domain?: string;
        public expiresAt?: Date;
        public timeRemaining?: number;
        public badge?: string;
        public browserNotification: any;
        public state?: string;
        constructor();
        public prepareForRemoval(): void;
        public asBrowserNotification(): Notification;
        public isExpired(): boolean;
        public isExtended(): boolean;
        public refresh(): boolean;
        public setUrl(value?: string): void;
        public setExpiration(value?: string): void;
        protected calculateMinutesRemaining(): void;
    }

    interface Service {
        key: string;
        value: string;
        label: string;
    }

    interface AuthRedirect {
        url: string;
    }

    interface MessageList {
        activateNext(): void;
        activateNone(): void;
        activatePrevious(): void;
        add(message: Message): void;
        canUnclear(): boolean;
        clear(messages: Message[]): void;
        clearById(id: string): void;
        clearFocused(): void;
        drop(publicIds: string | string[]): void;
        fetch(): void;
        purge(): void;
        reset(): void;
        tallyByGroup(): void;
        unclear(): void;
        visitLink(): void;
    }

    interface UserService {
        getServices(callback: ServiceCallback): void;
        setWebhook(url: string, callback: ServiceCallback): void;
        authorize(service: string, callback: ServiceCallback): void;
        deauthorize(service: string, callback: ServiceCallback): void;
        logIn(form: angular.IFormController): void;
        logOut(): void;
    }

    interface BrowserNotificationService {
        send: any;
    }

    interface ArchiveResponse {
        messages: RawMessage[];
    }

    interface ShortcutMap {
        [index: number]: Shortcut;
    }

    interface Shortcut {
        description: string;
        key: string | number;
        shiftKey: boolean;
        action(): void;
    }

    interface MessageOptionsScope extends ng.IScope {
        hidden: boolean;
        publicId: string;
        clear(): void;
    }

    interface StatusBarScope extends ng.IScope {
        disconnected: boolean;
        message: string;
    }

    interface ShortcutScope extends ng.IScope {
        summaryVisible: boolean;
        shortcuts: ShortcutMap;
    }

    interface NavScope extends ng.IScope {
        hideClearAll: boolean;
        hideUndo: boolean;
        queueSize: number;
        serviceProps: object;
        settingsVisible: boolean;
        state: StringMap;
        enable(service: string): void;
        clearAll(): void;
        logOut(): void;
        settings(state: boolean): void;
        toggle(service: string): void;
        undo(): void;
        webhookUrl?: string;
    }

    interface StringMap {
        [index: string]: string;
    }


}
