-- Run as a database administrator; change this local development password.
CREATE DATABASE IF NOT EXISTS variantscope CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'variantscope'@'localhost' IDENTIFIED BY 'variantscope';
GRANT ALL PRIVILEGES ON variantscope.* TO 'variantscope'@'localhost';
-- Flyway automatically creates and migrates tables at backend startup.
