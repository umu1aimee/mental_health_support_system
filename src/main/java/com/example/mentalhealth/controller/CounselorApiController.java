package com.example.mentalhealth.controller;

import com.example.mentalhealth.exception.ApiException;
import com.example.mentalhealth.model.Appointment;
import com.example.mentalhealth.model.Availability;
import com.example.mentalhealth.model.MoodEntry;
import com.example.mentalhealth.model.Patient;
import com.example.mentalhealth.model.User;
import com.example.mentalhealth.repository.AppointmentRepository;
import com.example.mentalhealth.repository.AvailabilityRepository;
import com.example.mentalhealth.repository.MoodEntryRepository;
import com.example.mentalhealth.repository.PatientRepository;
import com.example.mentalhealth.service.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/counselor")
public class CounselorApiController {
    private final SessionAuthService auth;
    private final PatientRepository patientRepository;
    private final MoodEntryRepository moodEntryRepository;
    private final AppointmentRepository appointmentRepository;
    private final AvailabilityRepository availabilityRepository;

    public CounselorApiController(SessionAuthService auth,
                                 PatientRepository patientRepository,
                                 MoodEntryRepository moodEntryRepository,
                                 AppointmentRepository appointmentRepository,
                                 AvailabilityRepository availabilityRepository) {
        this.auth = auth;
        this.patientRepository = patientRepository;
        this.moodEntryRepository = moodEntryRepository;
        this.appointmentRepository = appointmentRepository;
        this.availabilityRepository = availabilityRepository;
    }

    @GetMapping("/patients")
    public List<Map<String, Object>> myPatients(HttpSession session) {
        /**
         * Best-practice note:
         * A counselor's "My Patients" should reflect real interactions.
         *
         * We include:
         * - Patients explicitly assigned to this counselor (admin workflow)
         * - Patients who booked an appointment with this counselor (patient workflow)
         *
         * Deduping is done by patient id while preserving a stable order.
         */
        User counselor = auth.requireRole(session, User.Role.counselor);

        // Preserve insertion order (assigned first, then booked).
        Map<Long, Patient> unique = new LinkedHashMap<>();

        for (Patient p : patientRepository.findByAssignedCounselor(counselor)) {
            if (p != null && p.getId() != null) {
                unique.putIfAbsent(p.getId(), p);
            }
        }

        for (Appointment ap : appointmentRepository.findByCounselorOrderByAppointmentDateAscAppointmentTimeAsc(counselor)) {
            Patient p = ap.getPatient();
            if (p != null && p.getId() != null) {
                unique.putIfAbsent(p.getId(), p);
            }
        }

        return unique.values().stream().map(this::patientSummary).toList();
    }

    @GetMapping("/patients/{patientId}/mood")
    public List<Map<String, Object>> patientMood(@PathVariable Long patientId, HttpSession session) {
        User counselor = auth.requireRole(session, User.Role.counselor);
        Patient patient = patientRepository.findById(patientId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Patient not found"));
        /**
         * Authorization rule:
         * Counselors can view mood entries when there is an active care relationship.
         *
         * Relationship is true if:
         * - Patient is assigned to the counselor (admin workflow), OR
         * - Patient has booked at least one non-canceled appointment with this counselor (patient workflow).
         */
        boolean assigned = patient.getAssignedCounselor() != null
                && patient.getAssignedCounselor().getId() != null
                && patient.getAssignedCounselor().getId().equals(counselor.getId());

        boolean booked = appointmentRepository.existsByCounselorAndPatientAndStatusNot(counselor, patient, "canceled");

        if (!assigned && !booked) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return moodEntryRepository.findByPatientOrderByEntryDateAsc(patient)
                .stream()
                .map(this::moodEntryResponse)
                .toList();
    }

    @GetMapping("/appointments")
    public List<Map<String, Object>> myAppointments(HttpSession session) {
        User counselor = auth.requireRole(session, User.Role.counselor);
        return appointmentRepository.findByCounselorOrderByAppointmentDateAscAppointmentTimeAsc(counselor)
                .stream()
                .map(this::appointmentResponse)
                .toList();
    }

    @PostMapping("/appointments/{id}/status")
    public Map<String, Object> updateAppointmentStatus(@PathVariable Long id, @RequestBody StatusRequest req, HttpSession session) {
        User counselor = auth.requireRole(session, User.Role.counselor);
        Appointment ap = appointmentRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Appointment not found"));
        if (ap.getCounselor() == null || ap.getCounselor().getId() == null || !ap.getCounselor().getId().equals(counselor.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Access denied");
        }
        if (req == null || req.status == null || req.status.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "status is required");
        }
        String s = req.status.trim().toLowerCase();
        if (!s.equals("scheduled") && !s.equals("confirmed") && !s.equals("canceled")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid status");
        }
        ap.setStatus(s);
        ap = appointmentRepository.save(ap);
        return appointmentResponse(ap);
    }

    @GetMapping("/availability")
    public List<Map<String, Object>> myAvailability(HttpSession session) {
        User counselor = auth.requireRole(session, User.Role.counselor);
        return availabilityRepository.findByCounselorOrderByDayOfWeekAscStartTimeAsc(counselor)
                .stream()
                .map(this::availabilityResponse)
                .toList();
    }

    @PutMapping("/availability")
    @Transactional
    public List<Map<String, Object>> replaceAvailability(@RequestBody List<AvailabilityRequest> req, HttpSession session) {
        User counselor = auth.requireRole(session, User.Role.counselor);
        availabilityRepository.deleteByCounselor(counselor);

        if (req != null) {
            for (AvailabilityRequest r : req) {
                if (r == null) {
                    continue;
                }
                if (r.dayOfWeek == null || r.dayOfWeek < 0 || r.dayOfWeek > 6) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "dayOfWeek must be 0..6");
                }
                if (r.startTime == null || r.endTime == null || !r.startTime.isBefore(r.endTime)) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid time range");
                }
                Availability a = new Availability();
                a.setCounselor(counselor);
                a.setDayOfWeek(r.dayOfWeek);
                a.setStartTime(r.startTime);
                a.setEndTime(r.endTime);
                availabilityRepository.save(a);
            }
        }

        return availabilityRepository.findByCounselorOrderByDayOfWeekAscStartTimeAsc(counselor)
                .stream()
                .map(this::availabilityResponse)
                .toList();
    }

    private Map<String, Object> patientSummary(Patient patient) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", patient.getId());
        if (patient.getUser() != null) {
            m.put("user", userSummary(patient.getUser()));
        }
        m.put("emergencyContact", patient.getEmergencyContact());
        return m;
    }

    private Map<String, Object> userSummary(User user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", user.getId());
        m.put("name", user.getName());
        m.put("email", user.getEmail());
        m.put("role", user.getRole());
        return m;
    }

    private Map<String, Object> moodEntryResponse(MoodEntry entry) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", entry.getId());
        m.put("rating", entry.getRating());
        m.put("notes", entry.getNotes());
        m.put("entryDate", entry.getEntryDate());
        return m;
    }

    private Map<String, Object> appointmentResponse(Appointment ap) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", ap.getId());
        m.put("appointmentDate", ap.getAppointmentDate());
        m.put("appointmentTime", ap.getAppointmentTime());
        m.put("status", ap.getStatus());
        if (ap.getPatient() != null) {
            m.put("patientId", ap.getPatient().getId());
            if (ap.getPatient().getUser() != null) {
                m.put("patient", userSummary(ap.getPatient().getUser()));
            }
        }
        return m;
    }

    private Map<String, Object> availabilityResponse(Availability a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("dayOfWeek", a.getDayOfWeek());
        m.put("startTime", a.getStartTime());
        m.put("endTime", a.getEndTime());
        return m;
    }

    public static class StatusRequest {
        public String status;
    }

    public static class AvailabilityRequest {
        public Integer dayOfWeek;
        public java.time.LocalTime startTime;
        public java.time.LocalTime endTime;
    }
}
