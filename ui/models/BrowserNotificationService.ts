import m from 'mithril';

export const notificationsDeniedMessage =
    "They can be turned on from the brower's settings page.";
export const notificationsEnabledMessage =
    "They can be turned off from the browser's settings page.";
export const promptMessage = 'Turn them on';

export function isUncertain(): boolean {
    return window.Notification.permission === 'default';
}

export function isDenied(): boolean {
    return window.Notification.permission === 'denied';
}

export function isGranted(): boolean {
    return window.Notification.permission === 'granted';
}

export function isSupported(): boolean {
    return 'Notification' in window;
}

export function onOffMessage(): string {
    if (isGranted()) {
        return 'Browser notifications are on.';
    }

    if (isDenied()) {
        return 'Browser notifications are off.';
    }

    return '';
}

export function prompt(): void {
    window.Notification.requestPermission(() => {
        m.redraw();
    });
}
