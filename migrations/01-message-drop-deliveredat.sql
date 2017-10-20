BEGIN TRANSACTION;

ALTER TABLE Messages RENAME TO Messages_temp;

CREATE TABLE `Messages` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `publicId` UUID NOT NULL, `localId` VARCHAR(255), `pushbulletId` VARCHAR(255), `title` VARCHAR(255) NOT NULL, `url` VARCHAR(255), `body` VARCHAR(500), `source` VARCHAR(100), `group` VARCHAR(50) DEFAULT 'default', `unread` TINYINT(1) NOT NULL DEFAULT 1, `expiresAt` TIME, `received` DATETIME NOT NULL, `UserId` INTEGER REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE);

INSERT INTO Messages
SELECT id, publicId, localId, pushbulletId, title, url, body, source, `group`, unread, expiresAt, received, UserId
FROM Messages_temp;

DROP TABLE Messages_temp;

COMMIT;
