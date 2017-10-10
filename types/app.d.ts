interface NavScope extends ng.IScope {
    hideClearAll: boolean;
    hideUndo: boolean;
    queueSize: number;
    serviceProps: object;
    settingsVisible: boolean;
    state: IStringMap;

    enable(service: string): void;
    clearAll(): void;
    logOut(): void;
    settings(state: boolean): void;
    toggle(service: string): void;
    undo(): void;
}

interface Service {
    key: string;
    value: string;
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

interface ShortcutMap {
    [index: number]: Shortcut;
}

interface Shortcut {
    description: string;
    key: string | number;
    label: string;
    shiftKey: boolean;
    action(): void;
}

interface IStringMap {
    [index: string]: string;
}

interface IService {
    webhook?: string;
    url?: string;
}

type IServiceCallback = (services: any) => void;

interface IUserService {
    getServices(callback: IServiceCallback): void;
    setService(service: IService, callback: IServiceCallback): void;
    authorize(service: string, callback: IServiceCallback): void;
    deauthorize(service: string, callback: IServiceCallback): void;
    logIn(form: angular.IFormController): void;
    logOut(): void;
}

interface IBrowserNotificationService {
    send: any;
}

interface IMessageList {
    add(message: IMessage): void;
    canUnclear(): boolean;
    clear(publicIds: string | string[]): void;
    clearFocused(): void;
    drop(publicIds: string | string[]): void;
    empty(): void;
    fetch(): void;
    focusNext(): void;
    focusNone(): void;
    focusOne(step: number): void;
    focusPrevious(): void;
    purge(): void;
    tallyByGroup(): void;
    unclear(): void;
    visitLink(): void;

}
