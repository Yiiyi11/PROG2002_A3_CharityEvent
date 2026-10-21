-- ============================================================================
-- PROG2002 Assessment 3 - Charity Events Database
-- File   : charityevents_a3_schema.sql
-- Team   : Yiiyi11 (Member 1) & zhou123445 (Member 2)
-- MySQL  : 8.0.x
--
-- Schema evolution from Assessment 2
-- ----------------------------------------------------------------------------
-- A2 tables : categories, charity_organisations, events
-- A3 changes:
--   1. events        -> added latitude / longitude / capacity / status columns so
--                       the External Weather API (Open-Meteo) can be called and
--                       so the admin site can present a richer event record.
--   2. registrations -> NEW table. One row per user per event, linked to events
--                       through a foreign key. A UNIQUE constraint on
--                       (event_id, user_email) enforces the assessment rule
--                       "one user may register for multiple events but can only
--                       register for a given event once".
--   3. categories    -> extra rows to make the website look realistic.
-- ============================================================================

DROP DATABASE IF EXISTS `charityevents_db`;
CREATE DATABASE `charityevents_db`
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
USE `charityevents_db`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. categories (inherited from A2, unchanged structure)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `category_id`   INT           NOT NULL AUTO_INCREMENT,
  `category_name` VARCHAR(100)  NOT NULL,
  `description`   VARCHAR(255)  DEFAULT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_category_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `categories` (`category_id`, `category_name`, `description`) VALUES
  (1, 'Fun Run',          'Community runs and walks that raise money per kilometre'),
  (2, 'Gala Dinner',      'Formal dining events with auctions and speeches'),
  (3, 'Silent Auction',   'Bid on donated items and experiences over a fixed window'),
  (4, 'Charity Concert',  'Live music performances donated by artists'),
  (5, 'Volunteer Day',    'Hands-on community service and clean-up programs'),
  (6, 'Bake Sale',        'Community bake sales supporting local families');

-- ----------------------------------------------------------------------------
-- 2. charity_organisations (inherited from A2, extra rows for realism)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `charity_organisations`;
CREATE TABLE `charity_organisations` (
  `org_id`        INT          NOT NULL AUTO_INCREMENT,
  `org_name`      VARCHAR(150) NOT NULL,
  `mission`       TEXT         NOT NULL,
  `contact_email` VARCHAR(120) DEFAULT NULL,
  `contact_phone` VARCHAR(30)  DEFAULT NULL,
  `website`       VARCHAR(200) DEFAULT NULL,
  PRIMARY KEY (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `charity_organisations`
  (`org_id`, `org_name`, `mission`, `contact_email`, `contact_phone`, `website`) VALUES
  (1, 'Community Hope Foundation',
      'Raise funds for local disadvantaged communities through inclusive charity events.',
      'hope@charity.org', '0400 111 222', 'https://communityhope.example.org'),
  (2, 'Coastal Care Collective',
      'Protect beaches and marine life along the east coast while funding youth education.',
      'hello@coastalcare.org.au', '0400 333 444', 'https://coastalcare.example.org'),
  (3, 'Bright Futures Youth Trust',
      'Give young people access to mentoring, scholarships and creative programs.',
      'team@brightfutures.org.au', '0400 555 666', 'https://brightfutures.example.org');

-- ----------------------------------------------------------------------------
-- 3. events (A2 structure + latitude / longitude for the weather API)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `event_id`         INT            NOT NULL AUTO_INCREMENT,
  `org_id`           INT            NOT NULL,
  `category_id`      INT            NOT NULL,
  `event_name`       VARCHAR(200)   NOT NULL,
  `description`      TEXT           NOT NULL,
  `event_date`       DATETIME       NOT NULL,
  `location`         VARCHAR(200)   NOT NULL,
  `latitude`         DECIMAL(9,6)   DEFAULT NULL COMMENT 'Used by the Open-Meteo weather API',
  `longitude`        DECIMAL(9,6)   DEFAULT NULL COMMENT 'Used by the Open-Meteo weather API',
  `ticket_price`     DECIMAL(10,2)  NOT NULL DEFAULT '0.00',
  `capacity`         INT            NOT NULL DEFAULT 200,
  `charity_goal`     DECIMAL(12,2)  NOT NULL DEFAULT '0.00',
  `current_progress` DECIMAL(12,2)  NOT NULL DEFAULT '0.00',
  `is_suspended`     TINYINT(1)     NOT NULL DEFAULT '0',
  `event_image_url`  VARCHAR(255)   DEFAULT NULL,
  PRIMARY KEY (`event_id`),
  KEY `idx_eventdate` (`event_date`),
  KEY `idx_category`  (`category_id`),
  KEY `idx_org`       (`org_id`),
  CONSTRAINT `fk_events_org`      FOREIGN KEY (`org_id`)      REFERENCES `charity_organisations` (`org_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_events_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)           ON UPDATE CASCADE,
  CONSTRAINT `chk_events_price`   CHECK (`ticket_price` >= 0),
  CONSTRAINT `chk_events_latlng`  CHECK ((`latitude` IS NULL AND `longitude` IS NULL)
                                       OR (`latitude` BETWEEN -90 AND 90 AND `longitude` BETWEEN -180 AND 180))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `events`
  (`event_id`, `org_id`, `category_id`, `event_name`, `description`, `event_date`, `location`,
   `latitude`, `longitude`, `ticket_price`, `capacity`, `charity_goal`, `current_progress`,
   `is_suspended`, `event_image_url`) VALUES
  (1, 1, 1, 'City Fun Run 2026',
      'A 5km and 10km community fun run through the Brisbane riverbank. Every entry fee directly funds emergency accommodation for families experiencing homelessness.',
      '2026-11-15 08:00:00', 'Brisbane Park, QLD', -27.474067, 153.030239,
      25.00, 400, 15000.00, 7200.00, 0, 'img/run.jpg'),
  (2, 1, 2, 'Winter Gala Dinner',
      'Our flagship black-tie fundraising evening with a three-course dinner, live orchestra and a pledge auction hosted by local business leaders.',
      '2026-11-28 18:30:00', 'Riverside Hotel, Brisbane QLD', -27.469770, 153.025123,
      120.00, 180, 30000.00, 18500.00, 0, 'img/gala.jpg'),
  (3, 3, 3, 'Silent Auction Night',
      'Bid on artwork, weekend escapes and signed sporting memorabilia. All proceeds support the Bright Futures youth mentoring program.',
      '2026-10-24 19:00:00', 'City Convention Centre, Brisbane QLD', -27.476056, 153.017885,
      0.00, 250, 8000.00, 8200.00, 0, 'img/auction.jpg'),
  (4, 1, 4, 'Charity Rock Concert',
      'An all-ages live music night featuring six local bands. Proceeds fund mental health counselling sessions for young adults.',
      '2026-12-05 19:00:00', 'Central Arena, Fortitude Valley QLD', -27.456020, 153.036120,
      45.00, 800, 22000.00, 9100.00, 0, 'img/concert.jpg'),
  (5, 2, 1, 'Beach Fun Run',
      'A sunrise 7km coastal run along the Gold Coast shoreline, finishing with a community breakfast. Funds beach clean-up crews.',
      '2026-11-08 07:30:00', 'Gold Coast Beach, QLD', -28.016667, 153.400000,
      30.00, 500, 12000.00, 4500.00, 0, 'img/beachrun.jpg'),
  (6, 2, 2, 'Spring Charity Ball',
      'A spring formal ball with a five-course menu, dance floor and raffle. Supports coastal wildlife rescue volunteers.',
      '2026-11-21 18:00:00', 'Grand Ballroom, Broadbeach QLD', -28.033333, 153.433333,
      150.00, 220, 35000.00, 11000.00, 0, 'img/springball.jpg'),
  (7, 3, 3, 'Art Silent Auction',
      'Thirty donated works from Queensland artists are auctioned silently across one evening for childrens art therapy.',
      '2026-10-18 17:00:00', 'Queensland Art Gallery, South Bank QLD', -27.472700, 153.017800,
      0.00, 200, 10000.00, 10500.00, 0, 'img/artauction.jpg'),
  (8, 1, 4, 'Acoustic Charity Show',
      'An intimate acoustic evening in the Town Hall with three singer-songwriters. Every ticket purchases a school supply pack.',
      '2026-12-12 20:00:00', 'Brisbane Town Hall, QLD', -27.468890, 153.023500,
      20.00, 260, 5000.00, 2300.00, 0, 'img/acoustic.jpg'),
  (9, 3, 5, 'Coastal Volunteer Day',
      'A hands-on morning of beach clean-up and dune replanting followed by a free community barbecue for all volunteers.',
      '2026-11-01 09:00:00', 'Kingscliff Beach, NSW', -28.257500, 153.571400,
      0.00, 150, 4000.00, 1250.00, 0, 'img/springball.jpg'),
  (10, 2, 6, 'Community Bake Sale',
      'Local bakeries donate their best bakes for a one-day street sale raising money for school breakfast programs.',
      '2026-10-11 10:00:00', 'Surfers Paradise Esplanade, QLD', -28.002300, 153.431000,
      5.00, 300, 3000.00, 1850.00, 0, 'img/gala.jpg'),
  (11, 1, 1, 'Twilight Riverside Walk',
      'A relaxed 4km evening walk for all fitness levels, with lanterns and a closing ceremony at the river stage.',
      '2026-12-19 18:00:00', 'South Bank Parklands, Brisbane QLD', -27.481000, 153.023000,
      15.00, 350, 9000.00, 2100.00, 0, 'img/run.jpg'),
  (12, 3, 2, 'Scholarship Gala',
      'A fundraising dinner where every table sponsors a year of study for one regional student.',
      '2027-02-14 18:30:00', 'Customs House, Brisbane QLD', -27.466400, 153.030800,
      135.00, 160, 40000.00, 6000.00, 0, 'img/gala.jpg'),
  (13, 1, 4, 'Suspended Test Event',
      'Internal test record used to verify that suspended events are hidden from the public client-side website.',
      '2026-12-30 10:00:00', 'Test location', -27.470000, 153.020000,
      10.00, 50, 2000.00, 500.00, 1, 'img/auction.jpg');

-- ----------------------------------------------------------------------------
-- 4. registrations  (NEW in Assessment 3)
--    - registration_id  : surrogate primary key
--    - event_id         : foreign key -> events.event_id
--    - user_name / user_email / user_phone : who registered (contact details)
--    - registration_date: when the registration was created (used for the
--                         "latest first" ordering required on the event page)
--    - ticket_quantity  : how many tickets were purchased
--    - total_amount     : ticket_quantity * events.ticket_price (stored so the
--                         figure reported to the user can never drift)
--    - UNIQUE (event_id, user_email) stops a user registering twice for the
--      same event while still allowing the same user to join other events.
--    - ON DELETE RESTRICT keeps referential integrity: an event that has
--      registrations cannot be removed (the API also checks this explicitly
--      and returns a 409 response).
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `registrations`;
CREATE TABLE `registrations` (
  `registration_id`   INT           NOT NULL AUTO_INCREMENT,
  `event_id`          INT           NOT NULL,
  `user_name`         VARCHAR(120)  NOT NULL,
  `user_email`        VARCHAR(150)  NOT NULL,
  `user_phone`        VARCHAR(30)   NOT NULL,
  `ticket_quantity`   INT           NOT NULL DEFAULT 1,
  `total_amount`      DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `registration_date` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes`             VARCHAR(255)  DEFAULT NULL,
  PRIMARY KEY (`registration_id`),
  UNIQUE KEY `uq_registration_event_user` (`event_id`, `user_email`),
  KEY `idx_registration_date` (`registration_date`),
  KEY `idx_registration_event` (`event_id`),
  CONSTRAINT `fk_registrations_event`
    FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_registration_tickets` CHECK (`ticket_quantity` BETWEEN 1 AND 10),
  CONSTRAINT `chk_registration_amount`  CHECK (`total_amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Minimum of 10 registrations required by the brief (18 provided, spread across
-- several events and several dates so "latest first" ordering is visible).
INSERT INTO `registrations`
  (`registration_id`, `event_id`, `user_name`, `user_email`, `user_phone`,
   `ticket_quantity`, `total_amount`, `registration_date`, `notes`) VALUES
  ( 1,  1, 'Amelia Nguyen',    'amelia.nguyen@example.com',  '0412 100 201', 2,  50.00, '2026-09-12 09:14:00', 'Running with a friend'),
  ( 2,  1, 'Liam O''Connor',   'liam.oconnor@example.com',   '0412 100 202', 1,  25.00, '2026-09-18 17:42:00', NULL),
  ( 3,  1, 'Priya Sharma',     'priya.sharma@example.com',   '0412 100 203', 4, 100.00, '2026-09-25 11:05:00', 'Family entry'),
  ( 4,  1, 'Noah Williams',    'noah.williams@example.com',  '0412 100 204', 1,  25.00, '2026-10-02 08:30:00', NULL),
  ( 5,  1, 'Sofia Rossi',      'sofia.rossi@example.com',    '0412 100 205', 2,  50.00, '2026-10-08 19:20:00', NULL),
  ( 6,  2, 'Ethan Brown',      'ethan.brown@example.com',    '0412 100 206', 2, 240.00, '2026-09-20 13:10:00', 'Table for two'),
  ( 7,  2, 'Isabella Chen',    'isabella.chen@example.com',  '0412 100 207', 4, 480.00, '2026-10-01 20:45:00', 'Corporate table'),
  ( 8,  2, 'Mason Taylor',     'mason.taylor@example.com',   '0412 100 208', 1, 120.00, '2026-10-06 10:02:00', NULL),
  ( 9,  3, 'Harper Lee',       'harper.lee@example.com',     '0412 100 209', 2,   0.00, '2026-09-30 15:35:00', 'Bidding paddle 042'),
  (10,  3, 'Lucas Martin',     'lucas.martin@example.com',   '0412 100 210', 1,   0.00, '2026-10-05 18:12:00', NULL),
  (11,  4, 'Chloe Wilson',     'chloe.wilson@example.com',   '0412 100 211', 3, 135.00, '2026-10-03 21:00:00', 'Bringing two friends'),
  (12,  4, 'Oliver Davis',     'oliver.davis@example.com',   '0412 100 212', 2,  90.00, '2026-10-09 12:48:00', NULL),
  (13,  5, 'Mia Anderson',     'mia.anderson@example.com',   '0412 100 213', 2,  60.00, '2026-10-04 06:55:00', 'Sunrise run'),
  (14,  6, 'Jack Thompson',    'jack.thompson@example.com',  '0412 100 214', 2, 300.00, '2026-10-07 14:25:00', NULL),
  (15,  8, 'Grace Patel',      'grace.patel@example.com',    '0412 100 215', 2,  40.00, '2026-10-10 09:40:00', NULL),
  (16,  9, 'Henry Kim',        'henry.kim@example.com',      '0412 100 216', 1,   0.00, '2026-10-11 07:15:00', 'Volunteer crew lead'),
  (17, 10, 'Zoe Campbell',     'zoe.campbell@example.com',   '0412 100 217', 4,  20.00, '2026-10-09 08:05:00', 'Office morning tea'),
  (18, 11, 'Daniel Evans',     'daniel.evans@example.com',   '0412 100 218', 2,  30.00, '2026-10-12 16:30:00', NULL);

SET FOREIGN_KEY_CHECKS = 1;
