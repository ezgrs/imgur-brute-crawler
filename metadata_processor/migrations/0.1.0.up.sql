CREATE TABLE images (
    id CHAR(7) PRIMARY KEY,
    width SMALLINT NOT NULL,
    height SMALLINT NOT NULL,
    size INT NOT NULL,
    mime_type VARCHAR(63) NOT NULL,
    hash CHAR(64) NOT NULL
);
