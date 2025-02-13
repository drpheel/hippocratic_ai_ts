-- create databases, load initil data, set global variables
CREATE DATABASE IF NOT EXISTS `primary`;
USE `primary`;

CREATE TABLE IF NOT EXISTS PROMPT_GROUPS (
    id INT NOT NULL AUTO_INCREMENT,
    question TEXT,
    group_size INT,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS PROMPTS (
    id INT NOT NULL AUTO_INCREMENT,
    prompt_group_id INT NOT NULL,
    value TEXT,
    response TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (prompt_group_id) REFERENCES PROMPT_GROUPS(id)
);

CREATE TABLE IF NOT EXISTS BATTLE (
    id INT NOT NULL AUTO_INCREMENT,
    prompt_1 INT,
    prompt_2 INT,
    prompt_group_id INT NOT NULL,
    prompt_group_index INT NOT NULL,
    round INT NOT NULL,
    winner INT DEFAULT NULL,
    x_pos INT,
    y_pos INT,
    PRIMARY KEY (id),
    FOREIGN KEY (prompt_group_id) REFERENCES PROMPT_GROUPS(id),
    FOREIGN KEY (prompt_1) REFERENCES PROMPTS(id),
    FOREIGN KEY (prompt_2) REFERENCES PROMPTS(id),
    FOREIGN KEY (winner) REFERENCES PROMPTS(id)
);
ALTER TABLE BATTLE
ADD COLUMN next_battle INT DEFAULT NULL,
ADD CONSTRAINT fk_next_battle FOREIGN KEY (next_battle) REFERENCES BATTLE(id);

SET GLOBAL sort_buffer_size = 2097152;