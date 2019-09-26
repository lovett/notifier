import m from 'mithril';
import Message from './Message';

export const notificationsDeniedMessage = 'They can be turned on from the brower\'s settings page.';
export const notificationsEnabledMessage = 'They can be turned off from the browser\'s settings page.';
export let promptMessage = 'Turn them on';

export function isUncertain() {
    return window.Notification.permission === 'default';
}

export function isDenied() {
    return window.Notification.permission === 'denied';
}

export function isGranted() {
    return window.Notification.permission === 'granted';
}

export function isSupported() {
    return 'Notification' in window;
}

export function onOffMessage() {
    if (isGranted()) {
        return 'Browser notifications are on.';
    }

    if (isDenied()) {
        return 'Browser notifications are off.';
    }

    return '';
}

export function prompt() {
    window.Notification.requestPermission(() => {
        m.redraw();
    });
}
