export default {
    isDefault() {
        return window.Notification.permission === 'default';
    },

    isDenied() {
        return window.Notification.permission === 'denied';
    },

    isGranted() {
        return window.Notification.permission === 'granted';
    },

    isNotSupported() {
        return !this.isSupported();
    },

    isSupported() {
        return 'Notification' in window;
    },

    prompt() {
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
    },
};
