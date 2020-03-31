CREATE TABLE IF NOT EXISTS "Users" (
    id SERIAL PRIMARY KEY,
    "passwordHash" varchar(258) NOT NULL,
    username varchar(20) NOT NULL UNIQUE,
    "createdAt" timestamp DEFAULT NOW(),
    "updatedAt" timestamp DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "Messages" (
    id SERIAL PRIMARY KEY,
    body varchar(500),
    "expiresAt" timestamp,
    "group" varchar(50) DEFAULT NULL,
    "localId" varchar(255),
    "publicId" uuid NOT NULL,
    source varchar(100),
    title varchar(255) NOT NULL,
    unread boolean DEFAULT true NOT NULL,
    url varchar(255),
    received timestamp NOT NULL,
    "UserId" integer,
    badge varchar(50) DEFAULT NULL,
    FOREIGN KEY ("UserId") REFERENCES "Users" (id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS messages_unread ON "Messages" (unread);

CREATE TABLE IF NOT EXISTS "Tokens" (
    id SERIAL PRIMARY KEY,
    key varchar(88) NOT NULL,
    label varchar(100),
    persist boolean DEFAULT false NOT NULL,
    value text NOT NULL,
    "createdAt" timestamp DEFAULT NOW(),
    "updatedAt" timestamp DEFAULT NULL,
    "UserId" integer,
    FOREIGN KEY ("UserId") REFERENCES "Users" (id) ON UPDATE CASCADE ON DELETE SET NULL
);
