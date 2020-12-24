CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    password_hash varchar(258) NOT NULL,
    username varchar(20) NOT NULL UNIQUE,
    created_at timestamp DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    body varchar(500),
    expires_at timestamp,
    group_name varchar(50) DEFAULT NULL,
    local_id varchar(255),
    public_id uuid NOT NULL,
    source varchar(100),
    title varchar(255) NOT NULL,
    unread boolean DEFAULT true NOT NULL,
    url varchar(255),
    received timestamp NOT NULL,
    user_id integer,
    badge varchar(50) DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS messages_unread ON messages ((1)) WHERE unread=true;

CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    key varchar(88) NOT NULL,
    label varchar(100),
    persist boolean DEFAULT false NOT NULL,
    value text NOT NULL,
    created_at timestamp DEFAULT NOW(),
    user_id integer,
    FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
);
