export const notificationsDeniedMessage = 'They can be turned on from the brower\'s settings page.';
export const notificationsEnabledMessage = 'They can be turned off from the browser\'s settings page.';
export const notificationEnableLabel = 'Turn them on';

export function isDefault() {
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

    return 'Browser notifications are off.';
}

export function prompt() {
    window.Notification.requestPermission((permission: string) => {
        if (permission === 'granted') {
            alert('Notifications are enabled.');
            return;
            // const message = new Message();
            // message.publicId = 'notification-enabled';
            // message.group = 'internal';
            // message.title = 'Browser notifications enabled';

            // // send(message, true);
        }

        window.location.reload();
    });
}
