# Testing Plan

## Scope

Backend (Spring Boot REST API) and static frontend served from `src/main/resources/static`.

## Automated tests (JUnit + MockMvc)

- Authentication
  - Register user (patient/counselor/admin) returns 201 and session established
  - Login with invalid credentials returns 401
  - Logout clears session

- Patient mood tracking
  - Create/update mood entry (rating bounds 1..10)
  - Read mood history sorted by date

- Appointment booking
  - Book appointment within availability returns 201
  - Book appointment outside availability returns 400
  - Book appointment in conflicting slot returns 400
  - Patient cancels own appointment returns 200
  - Patient cannot cancel another patient’s appointment returns 403

- Counselor dashboard
  - Counselor lists assigned patients
  - Counselor replaces availability (validations: dayOfWeek 0..6, start < end)
  - Counselor updates appointment status (valid status values)

- Admin
  - Admin can list users
  - Admin can change role, toggle active, and delete user

## Manual tests (browser)

- Open `http://localhost:8080/` and validate:
  - Login/Register flows
  - Patient mood tracker and appointment booking UI
  - Counselor dashboard and availability editor
  - Admin user management

## Test data

- Default local run uses H2 in-memory DB.
- For Postgres integration testing, set env vars:
  - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DRIVER`
