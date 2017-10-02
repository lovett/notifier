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
