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
import com.example.mentalhealth.repository.UserRepository;
import com.example.mentalhealth.service.SessionAuthService;
import com.example.mentalhealth.service.booking.AppointmentBookingService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patient")
public class PatientApiController {
    private final SessionAuthService auth;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final MoodEntryRepository moodEntryRepository;
    private final AppointmentRepository appointmentRepository;
    private final AvailabilityRepository availabilityRepository;
    private final AppointmentBookingService appointmentBookingService;

    public PatientApiController(SessionAuthService auth,
                               UserRepository userRepository,
                               PatientRepository patientRepository,
                               MoodEntryRepository moodEntryRepository,
                               AppointmentRepository appointmentRepository,
                               AvailabilityRepository availabilityRepository,
                               AppointmentBookingService appointmentBookingService) {
        this.auth = auth;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.moodEntryRepository = moodEntryRepository;
        this.appointmentRepository = appointmentRepository;
        this.availabilityRepository = availabilityRepository;
        this.appointmentBookingService = appointmentBookingService;
    }

    @GetMapping("/counselors")
    public List<Map<String, Object>> listCounselors(HttpSession session) {
        auth.requireRole(session, User.Role.patient);
        return userRepository.findByRole(User.Role.counselor)
                .stream()
                .filter(User::isActive)
                .map(this::userSummary)
                .toList();
    }

    @GetMapping("/counselors/{counselorId}/availability")
    public List<Map<String, Object>> counselorAvailability(@PathVariable Long counselorId, @RequestParam(required = false) Integer dayOfWeek, HttpSession session) {
        auth.requireRole(session, User.Role.patient);
        User counselor = userRepository.findById(counselorId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Counselor not found"));
        if (counselor.getRole() != User.Role.counselor) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "User is not a counselor");
        }

        List<Availability> slots = (dayOfWeek == null)
                ? availabilityRepository.findByCounselorOrderByDayOfWeekAscStartTimeAsc(counselor)
                : availabilityRepository.findByCounselorAndDayOfWeekOrderByStartTimeAsc(counselor, dayOfWeek);

        return slots.stream().map(this::availabilityResponse).toList();
    }

    @PostMapping("/mood")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> upsertMood(@RequestBody MoodRequest req, HttpSession session) {
        User me = auth.requireRole(session, User.Role.patient);
        Patient patient = patientRepository.findByUserId(me.getId()).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Patient profile not found"));

        if (req == null || req.rating < 1 || req.rating > 10) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mood rating must be between 1 and 10");
        }

        LocalDate date = req.entryDate == null ? LocalDate.now() : req.entryDate;
        MoodEntry entry = moodEntryRepository.findByPatientAndEntryDate(patient, date).orElse(new MoodEntry());
        entry.setPatient(patient);
        entry.setEntryDate(date);
        entry.setRating(req.rating);
        entry.setNotes(req.notes);
        entry = moodEntryRepository.save(entry);

        return moodEntryResponse(entry);
    }

    @GetMapping("/mood")
    public List<Map<String, Object>> moodHistory(HttpSession session) {
        User me = auth.requireRole(session, User.Role.patient);
        Patient patient = patientRepository.findByUserId(me.getId()).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Patient profile not found"));
        return moodEntryRepository.findByPatientOrderByEntryDateAsc(patient)
                .stream()
                .map(this::moodEntryResponse)
                .toList();
    }

    @GetMapping("/appointments")
    public List<Map<String, Object>> myAppointments(HttpSession session) {
        User me = auth.requireRole(session, User.Role.patient);
        Patient patient = patientRepository.findByUserId(me.getId()).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Patient profile not found"));
        return appointmentRepository.findByPatientOrderByAppointmentDateAscAppointmentTimeAsc(patient)
                .stream()
                .map(this::appointmentResponse)
                .toList();
    }

    @PostMapping("/appointments")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> bookAppointment(@RequestBody BookAppointmentRequest req, HttpSession session) {
        User me = auth.requireRole(session, User.Role.patient);
        Patient patient = patientRepository.findByUserId(me.getId()).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Patient profile not found"));

        if (req == null || req.counselorId == null || req.appointmentDate == null || req.appointmentTime == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "counselorId, appointmentDate and appointmentTime are required");
        }

        User counselor = userRepository.findById(req.counselorId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Counselor not found"));
        Appointment ap = appointmentBookingService.bookAppointment(patient, counselor, req.appointmentDate, req.appointmentTime);

        return appointmentResponse(ap);
    }

    @PostMapping("/appointments/{id}/cancel")
    public Map<String, Object> cancelAppointment(@PathVariable Long id, HttpSession session) {
        User me = auth.requireRole(session, User.Role.patient);
        Patient patient = patientRepository.findByUserId(me.getId()).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Patient profile not found"));

        Appointment ap = appointmentRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Appointment not found"));
        if (ap.getPatient() == null || ap.getPatient().getId() == null || !ap.getPatient().getId().equals(patient.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Access denied");
        }
        ap.setStatus("canceled");
        ap = appointmentRepository.save(ap);
        return appointmentResponse(ap);
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
        if (ap.getCounselor() != null) {
            m.put("counselor", userSummary(ap.getCounselor()));
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

    private Map<String, Object> userSummary(User user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", user.getId());
        m.put("name", user.getName());
        m.put("email", user.getEmail());
        m.put("role", user.getRole());
        m.put("specialty", user.getSpecialty());
        return m;
    }

    public static class MoodRequest {
        public int rating;
        public String notes;
        public LocalDate entryDate;
    }

    public static class BookAppointmentRequest {
        public Long counselorId;
        public LocalDate appointmentDate;
        public LocalTime appointmentTime;
    }
}
