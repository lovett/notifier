import Message from '../app/message';

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
    shiftKey: boolean;
    action(): void;
}

interface IStringMap {
    [index: string]: string;
}


interface IBrowserNotificationService {
    send: any;
}
