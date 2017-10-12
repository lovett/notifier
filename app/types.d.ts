declare namespace app {
    type ServiceCallback = (services: any) => void;

    type WebhookSubmissionCallback = (successfuly: boolean) => void;

    class Message {
        public body?: string;
        public expiresAt?: string;
        public group: string;
        public publicId: string;
        public received: string;
        public stage: string;
        public title: string;
        public url?: string;
        constructor();
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
        messages: Message[];
    }
}
