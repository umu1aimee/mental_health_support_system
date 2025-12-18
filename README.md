# MindCare (MindCare Mini) — Mental Health Support Platform

MindCare is a role-based mental health support web app built with **Spring Boot (Java)** and a **vanilla JS single-page UI**.  
It supports **Patients**, **Counselors**, and **Admins** with workflows for mood tracking, availability management, appointment booking, and user administration.

---

## Key roles & what they can do

### Patient
- **Mood Tracker**: log daily mood (rating + optional notes), view history/trends.
- **Find Counselors**: browse counselors with **specialty** + **weekly availability** indicators.
- **Appointments**: check availability by date, book appointment, view/cancel appointments.

### Counselor
- **Availability**: define weekly availability slots (day of week + start/end time).
- **My Patients**: see patients assigned to them **and** patients who booked them.
- **Patient Mood View**: view mood history of patients who are assigned or booked with them.
- **Appointments**: view upcoming appointments and update appointment status.

### Admin
- **User Management**:
  - Create counselors/admins
  - **Edit user details** (name/email/specialty) **but not roles**
  - Activate/deactivate users
  - Delete users (with confirmation; cascade cleanup is handled server-side)

---

## Tech stack

### Backend
- Java 17, Spring Boot
- Spring Web (REST controllers)
- Spring Data JPA + Hibernate
- PostgreSQL (recommended) / H2 (tests)

### Frontend
- Static SPA in `src/main/resources/static/`
- Vanilla JS modules + hash router
- Modern CSS (responsive, role-based navigation)

---

## Architecture (high-level)

- **Backend is REST-based** under `/api/...`
  - Controllers enforce **role authorization** via `SessionAuthService`.
  - Data is stored via JPA entities + repositories.
- **Frontend is a hash-based SPA**
  - Routes are defined in `static/js/main.js` and resolved by `static/js/router.js`.
  - API calls are made through `static/js/api.js`.
  - UI state (logged-in user) is stored in `static/js/state.js`.

### Design pattern used (explicit)
**Observer Pattern** (Frontend state management):
- `static/js/state.js` exposes `subscribe()` and `setState()`.
- UI updates (nav visibility, user badge) subscribe to state changes so pages do not tightly couple to auth logic.

---

## Project structure (important folders)

```text
src/main/java/com/example/mentalhealth/
  controller/      REST APIs (Auth, Patient, Counselor, Admin, etc.)
  model/           JPA entities (User, Patient, Appointment, MoodEntry, Availability, ...)
  repository/      Spring Data JPA repositories
  service/         Business logic (sessions, booking service)

src/main/resources/static/
  index.html        Single-page shell (navbar + footer)
  styles.css        App styling
  js/
    main.js         Route definitions + nav wiring
    api.js          Fetch wrapper
    router.js       Hash router
    state.js        Global state (Observer pattern)
    pages/          Page modules (patient/counselor/admin views)
```

---

## Configuration

Main config file: `src/main/resources/application.properties`

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/mindcaremini
spring.datasource.username=postgres
spring.datasource.password=...
spring.jpa.hibernate.ddl-auto=update
server.port=8080
```

Admin bootstrap defaults (overridable by env vars):
```properties
mindcare.admin.email=admin@mindcare.local
mindcare.admin.password=admin123
mindcare.admin.name=Default Admin
```

---

## How to run (local)

### 1) Start PostgreSQL (recommended)
Create a database (example):
- DB: `mindcaremini`
- User: `postgres`
- Password: set in `application.properties` (or env vars)

### 2) Run the app

On Windows (PowerShell):
```powershell
.\mvnw.cmd spring-boot:run
```

Then open:
- `http://localhost:8080`

---

## Common API routes (overview)

### Auth
- `GET /api/auth/me` — current session user
- `POST /api/auth/login` — login
- `POST /api/auth/logout` — logout

### Patient
- `GET /api/patient/counselors`
- `GET /api/patient/counselors/{id}/availability`
- `GET/POST /api/patient/mood`
- `GET/POST /api/patient/appointments`

### Counselor
- `GET /api/counselor/patients`
- `GET /api/counselor/patients/{patientId}/mood`
- `GET/PUT /api/counselor/availability`
- `GET /api/counselor/appointments`

### Admin
- `GET /api/admin/users`
- `PUT /api/admin/users/{id}` — edit name/email/specialty (role is not editable)
- `POST /api/admin/users/{id}/active` — activate/deactivate
- `DELETE /api/admin/users/{id}`

---

## UML / Diagram codes (simple)

You can paste these into:
- **PlantUML** (recommended): `https://plantuml.com/`
- Or **Mermaid** if your renderer supports it.

### 1) Activity Diagram (Patient books an appointment) — PlantUML

```plantuml
@startuml
title Activity: Patient Books Appointment

start
:Patient logs in;
:Open Appointments page;
:Browse counselors (name + specialty + availability);
:Select a counselor;
:Pick date;
if (Counselor available on that day?) then (Yes)
  :Show available time windows;
  :Pick time;
  :Submit booking request;
  if (Time slot still free?) then (Yes)
    :Create appointment (scheduled);
    :Show success message;
  else (No)
    :Show error (slot taken);
  endif
else (No)
  :Show \"Not available\" message;
  :Pick another date or counselor;
endif
stop
@enduml
```

### 2) Data Flow Diagram (DFD) — Level 3 (Appointment Booking) — PlantUML

This “Level 3” DFD focuses on the **Appointment Booking** subsystem and decomposes it into smaller steps.

```plantuml
@startuml
title DFD Level 3: Appointment Booking Subsystem

actor Patient
rectangle "MindCare System" {
  rectangle "3.1 Select Counselor" as P31
  rectangle "3.2 Fetch Availability" as P32
  rectangle "3.3 Validate Slot" as P33
  rectangle "3.4 Create Appointment" as P34
  rectangle "3.5 Confirm & Display" as P35
}

database "D1 Users" as D1
database "D2 Availability" as D2
database "D3 Appointments" as D3

Patient --> P31 : counselor choice\nfilters (specialty)
P31 --> D1 : read counselors\n(role=counselor)
D1 --> P31 : counselor list\n(name, specialty)
P31 --> Patient : counselor cards\n+ specialty

Patient --> P32 : selected counselor + date
P32 --> D2 : read slots\nby counselor + day
D2 --> P32 : slots (day,start,end)
P32 --> Patient : availability shown\n(available/unavailable)

Patient --> P33 : chosen time
P33 --> D3 : check conflicts\n(status != canceled)
D3 --> P33 : conflict yes/no
P33 --> Patient : validation result

P33 --> P34 : validated request
P34 --> D3 : write appointment\n(date,time,status)
D3 --> P35 : new appointment record
P35 --> Patient : booking confirmation\n+ appointment details

@enduml
```

### 3) Sequence Diagram (Patient books appointment) — PlantUML

```plantuml
@startuml
title Sequence: Patient Books Appointment

actor Patient
participant "SPA (Browser UI)" as UI
participant "PatientApiController" as PAC
participant "AvailabilityRepository" as AR
participant "AppointmentBookingService" as ABS
participant "AppointmentRepository" as APR

Patient -> UI : Select counselor + date
UI -> PAC : GET /api/patient/counselors/{id}/availability?dayOfWeek=...
PAC -> AR : find slots
AR --> PAC : slots
PAC --> UI : slots JSON

Patient -> UI : Choose time + Book
UI -> PAC : POST /api/patient/appointments\n(counselorId,date,time)
PAC -> ABS : bookAppointment(patient,counselor,date,time)
ABS -> APR : exists conflict? (status != canceled)
APR --> ABS : yes/no
alt slot free
  ABS -> APR : save appointment (scheduled)
  APR --> ABS : appointment
  ABS --> PAC : appointment
  PAC --> UI : 201 Created + appointment JSON
  UI --> Patient : success toast
else slot taken
  ABS --> PAC : throws ApiException (conflict)
  PAC --> UI : 409 + error
  UI --> Patient : error toast
end

@enduml
```

---

## Notes
- If you change frontend files, the source of truth is `src/main/resources/static/...`.
- In some IDE/run setups, you may need to re-run the build or restart the app for static resources to refresh.


