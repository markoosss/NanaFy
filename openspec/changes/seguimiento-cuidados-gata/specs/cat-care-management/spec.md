# Spec Delta

## Purpose

Give the household a shared place to coordinate the cat's care, record completed activities, and review useful history across mobile and desktop devices.

## ADDED Requirements

### Requirement: Household profiles
The system MUST provide separate profiles for Marcos, Mama, Papa, Kiro, and Invitado. A person MUST select a profile and authenticate to use its permissions.

#### Scenario: Selecting a household profile
- **WHEN** a person selects one of the five profiles and provides its valid password
- **THEN** the system grants access as that profile

### Requirement: First-use account activation
The system MUST require a profile-specific activation code before a profile can choose its own password for first use. An activation code MUST NOT activate more than one profile.

#### Scenario: Activating a profile
- **WHEN** a person enters a valid code for a profile that has not been activated and chooses a password
- **THEN** the system activates that profile with the chosen password

### Requirement: Device choice at login
After successful authentication, the system MUST ask on every login whether the person is using a mobile device or a PC, then continue with the selected presentation.

#### Scenario: Choosing a device
- **WHEN** an authenticated person selects mobile or PC
- **THEN** the system opens the app in the corresponding presentation

### Requirement: Shared care information
The system MUST make the current care schedules, calendar entries, notes, and activity history available to authorized profiles across the household's devices.

#### Scenario: Viewing an update from another device
- **WHEN** a profile opens a care record previously saved by another authorized profile
- **THEN** the system shows the saved record rather than a device-local copy

### Requirement: Care schedules
Marcos MUST be able to create and update feeding schedules, medication schedules, and extra care tasks such as cleaning the litter box or refreshing water.

#### Scenario: Updating a medication schedule
- **WHEN** Marcos saves a medication schedule
- **THEN** the updated schedule is available to authorized profiles

### Requirement: Medication details
Each medication schedule MUST show the medication name, care instructions, and planned times in a dedicated medication section.

#### Scenario: Reviewing medication instructions
- **WHEN** an authorized profile opens the medication section
- **THEN** the system displays each medication's name, instructions, and planned times

### Requirement: Daily care schedule
The system MUST show feeding, medication, and extra care activities in a daily schedule with their planned times and completion status.

#### Scenario: Reviewing today's care
- **WHEN** a profile opens the daily care schedule
- **THEN** the system displays today's planned activities and whether each has been completed

### Requirement: Care completion history
Family profiles and Invitado MUST be able to record completion of a scheduled feeding, medication, or extra care task. Each completion MUST retain the acting profile and completion time for later review.

#### Scenario: Recording a completed task
- **WHEN** a profile marks an available care activity as complete
- **THEN** the system saves the activity, profile, and completion time in the shared history

### Requirement: Household administration permissions
Only Marcos MUST be able to administer profiles, activation codes, and care schedules. Invitado MUST be limited to viewing care information and recording care completions, and MUST NOT administer those settings or delete history.

#### Scenario: Guest attempts to change a care schedule
- **WHEN** Invitado attempts to update a care schedule
- **THEN** the system denies the change and leaves the saved schedule unchanged

### Requirement: Care calendar
The system MUST let family profiles create and review calendar entries for veterinarian visits, checkups, and other care dates. Invitado MUST be able to view calendar entries but not change them.

#### Scenario: Reviewing a veterinary visit
- **WHEN** a profile opens the care calendar
- **THEN** the system displays the saved veterinary visit and its date

#### Scenario: Adding a veterinary visit
- **WHEN** a family profile saves a veterinary visit with its date
- **THEN** the system makes the event available in the shared care calendar

### Requirement: Shared notes
The system MUST let family profiles create and review notes about the cat, and saved notes MUST be available across devices.

#### Scenario: Adding a note
- **WHEN** a family profile saves a note
- **THEN** another authorized family profile can review that note from its device
