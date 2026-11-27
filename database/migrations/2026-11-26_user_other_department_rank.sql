ALTER TABLE xxafmc_users
  ADD COLUMN OTHER_DEPARTMENT VARCHAR(255) NULL,
  ADD COLUMN OTHER_RANK VARCHAR(255) NULL;
use AFMC_MESS_DEV_APEX_DB;

CREATE TABLE `xxafmc_departments` (
    `DEPARTMENT_ID` INT NOT NULL AUTO_INCREMENT,
    `DEPARTMENT_NAME` VARCHAR(150) NOT NULL,
    `IS_ACTIVE` BOOLEAN DEFAULT TRUE,
    `CREATION_DATE` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `CREATED_BY` VARCHAR(100),
    PRIMARY KEY (`DEPARTMENT_ID`)
);

CREATE TABLE `xxafmc_ranks` (
    `RANK_ID` INT NOT NULL AUTO_INCREMENT,
    `RANK_NAME` VARCHAR(150) NOT NULL,
    `IS_ACTIVE` BOOLEAN DEFAULT TRUE,
    `CREATION_DATE` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `CREATED_BY` VARCHAR(100),
    PRIMARY KEY (`RANK_ID`)
);

ALTER TABLE `xxafmc_users`
ADD COLUMN `DEPARTMENT_ID` INT DEFAULT NULL,
ADD COLUMN `RANK_ID` INT DEFAULT NULL;

ALTER TABLE xxafmc_ranks
ADD COLUMN SERVICE VARCHAR(50) DEFAULT 'Common',
ADD COLUMN RANK_ABBREVIATION VARCHAR(50) DEFAULT NULL;





INSERT INTO xxafmc_departments
(DEPARTMENT_NAME, IS_ACTIVE, CREATED_BY)
VALUES
('Dept of Medicine', 1, 'SYSTEM'),
('Dept of Surgery', 1, 'SYSTEM'),
('Dept of Obs & Gyn', 1, 'SYSTEM'),
('Dept of Anaesthesia', 1, 'SYSTEM'),
('Dept of Radiology', 1, 'SYSTEM'),
('Dept of ENT', 1, 'SYSTEM'),
('Dept of Ophthalmology', 1, 'SYSTEM'),
('Dept of Pediatrics', 1, 'SYSTEM'),
('Dept of Orthopaedics', 1, 'SYSTEM'),
('Dept of Anatomy', 1, 'SYSTEM'),
('Dept of Physiology', 1, 'SYSTEM'),
('Dept of Biochemistry', 1, 'SYSTEM'),
('Dept of Pharmacology', 1, 'SYSTEM'),
('Dept of Forensic Medicine', 1, 'SYSTEM'),
('Dept of Pathology', 1, 'SYSTEM'),
('Dept of Microbiology', 1, 'SYSTEM'),
('Dept of Community Med', 1, 'SYSTEM'),
('Dept of IH&BT', 1, 'SYSTEM'),
('Dept of Hosp Adm', 1, 'SYSTEM'),
('Dept of Geriatric Medicine', 1, 'SYSTEM'),
('Dept of Dental Surgery', 1, 'SYSTEM'),
('Dept of Sports Medicine', 1, 'SYSTEM'),
('Dept of Psychiatry', 1, 'SYSTEM'),
('Dept of Pharmacy', 1, 'SYSTEM'),
('Dept of Dermatology', 1, 'SYSTEM'),
('Dir & Comdt', 1, 'SYSTEM'),
('Tech Editor MJAFI', 1, 'SYSTEM'),
('OIC Adm Cell', 1, 'SYSTEM'),
('Brig I/C Adm', 1, 'SYSTEM'),
('Brig I/C Trg', 1, 'SYSTEM'),
('Air Cmde Adm (UG)', 1, 'SYSTEM'),
('Col Trg (PMT)', 1, 'SYSTEM'),
('Col Trg (GW)', 1, 'SYSTEM'),
('Capt (IN) I/C Adm', 1, 'SYSTEM'),
('QM', 1, 'SYSTEM'),
('SO to Dir & Comdt', 1, 'SYSTEM'),
('Coy Cdr', 1, 'SYSTEM'),
('AQM', 1, 'SYSTEM'),
('MI Room', 1, 'SYSTEM'),
('Dean & Dy Comdt', 1, 'SYSTEM'),
('Asst Adm Offr', 1, 'SYSTEM'),
('Cmde Adm (UG)', 1, 'SYSTEM'),
('Col I/C Adm', 1, 'SYSTEM'),
('Addl Offr, HQ Trg Team', 1, 'SYSTEM'),
('Adm Offr (Coord)', 1, 'SYSTEM'),
('Bn Cdr (GW)', 1, 'SYSTEM'),
('Legal Officer', 1, 'SYSTEM'),
('Account Offr', 1, 'SYSTEM'),
('MH (CTC)', 1, 'SYSTEM'),
('MH (KIRKEE)', 1, 'SYSTEM'),
('CH (SC)', 1, 'SYSTEM'),
('CMDC', 1, 'SYSTEM'),
('ALC', 1, 'SYSTEM'),
('Others', 1, 'SYSTEM'),
('GUEST', 1, 'SYSTEM');

INSERT INTO xxafmc_ranks
(RANK_NAME, SERVICE, RANK_ABBREVIATION, IS_ACTIVE, CREATED_BY)
VALUES

-- Indian Army
('Field Marshal', 'Indian Army', 'FM', 1, 'SYSTEM'),
('General', 'Indian Army', 'Gen', 1, 'SYSTEM'),
('Lieutenant General', 'Indian Army', 'Lt Gen', 1, 'SYSTEM'),
('Major General', 'Indian Army', 'Maj Gen', 1, 'SYSTEM'),
('Brigadier', 'Indian Army', 'Brig', 1, 'SYSTEM'),
('Colonel', 'Indian Army', 'Col', 1, 'SYSTEM'),
('Lieutenant Colonel', 'Indian Army', 'Lt Col', 1, 'SYSTEM'),
('Major', 'Indian Army', 'Maj', 1, 'SYSTEM'),
('Captain', 'Indian Army', 'Capt', 1, 'SYSTEM'),
('Lieutenant', 'Indian Army', 'Lt', 1, 'SYSTEM'),

-- Indian Navy
('Admiral of the Fleet', 'Indian Navy', 'Adm of the Fleet', 1, 'SYSTEM'),
('Admiral', 'Indian Navy', 'Adm', 1, 'SYSTEM'),
('Vice Admiral', 'Indian Navy', 'VAdm', 1, 'SYSTEM'),
('Rear Admiral', 'Indian Navy', 'RAdm', 1, 'SYSTEM'),
('Commodore', 'Indian Navy', 'Cmde', 1, 'SYSTEM'),
('Captain', 'Indian Navy', 'Capt', 1, 'SYSTEM'),
('Commander', 'Indian Navy', 'Cdr', 1, 'SYSTEM'),
('Lieutenant Commander', 'Indian Navy', 'Lt Cdr', 1, 'SYSTEM'),
('Lieutenant', 'Indian Navy', 'Lt', 1, 'SYSTEM'),
('Sub Lieutenant', 'Indian Navy', 'SLt / Sub Lt', 1, 'SYSTEM'),

-- Indian Air Force
('Marshal of the Indian Air Force', 'Indian Air Force', 'MIAF', 1, 'SYSTEM'),
('Air Chief Marshal', 'Indian Air Force', 'ACM', 1, 'SYSTEM'),
('Air Marshal', 'Indian Air Force', 'Air Mshl', 1, 'SYSTEM'),
('Air Vice Marshal', 'Indian Air Force', 'AVM', 1, 'SYSTEM'),
('Air Commodore', 'Indian Air Force', 'Air Cmde', 1, 'SYSTEM'),
('Group Captain', 'Indian Air Force', 'Gp Capt', 1, 'SYSTEM'),
('Wing Commander', 'Indian Air Force', 'Wg Cdr', 1, 'SYSTEM'),
('Squadron Leader', 'Indian Air Force', 'Sqn Ldr', 1, 'SYSTEM'),
('Flight Lieutenant', 'Indian Air Force', 'Flt Lt', 1, 'SYSTEM'),
('Flying Officer', 'Indian Air Force', 'Fg Offr', 1, 'SYSTEM'),

-- Common
('Mr', 'Common', 'Mr', 1, 'SYSTEM'),
('Others', 'Common', 'Others', 1, 'SYSTEM');


ALTER TABLE xxafmc_users
  ADD COLUMN OTHER_DEPARTMENT VARCHAR(255) NULL,
  ADD COLUMN OTHER_RANK VARCHAR(255) NULL;