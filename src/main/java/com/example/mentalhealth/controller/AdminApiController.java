package com.example.mentalhealth.controller;

import com.example.mentalhealth.exception.ApiException;
import com.example.mentalhealth.model.Patient;
import com.example.mentalhealth.model.User;
import com.example.mentalhealth.repository.AppointmentRepository;
import com.example.mentalhealth.repository.AvailabilityRepository;
import com.example.mentalhealth.repository.MoodEntryRepository;
import com.example.mentalhealth.repository.PatientRepository;
import com.example.mentalhealth.repository.UserRepository;
import com.example.mentalhealth.service.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminApiController {
    private final SessionAuthService auth;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final MoodEntryRepository moodEntryRepository;
    private final AppointmentRepository appointmentRepository;
    private final AvailabilityRepository availabilityRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public AdminApiController(SessionAuthService auth,
                             UserRepository userRepository,
                             PatientRepository patientRepository,
                             MoodEntryRepository moodEntryRepository,
                             AppointmentRepository appointmentRepository,
                             AvailabilityRepository availabilityRepository,
                             BCryptPasswordEncoder passwordEncoder) {
        this.auth = auth;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.moodEntryRepository = moodEntryRepository;
        this.appointmentRepository = appointmentRepository;
        this.availabilityRepository = availabilityRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/users")
    public List<Map<String, Object>> users(HttpSession session) {
        auth.requireRole(session, User.Role.admin);
        return userRepository.findAll().stream().map(this::userResponse).toList();
    }

    @PostMapping("/counselors")
    public Map<String, Object> createCounselor(@RequestBody CreateUserRequest req, HttpSession session) {
        auth.requireRole(session, User.Role.admin);
        if (req == null || req.email == null || req.email.isBlank() || req.password == null || req.password.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email and password are required");
        }

        String normalizedEmail = req.email.trim().toLowerCase();
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setName(req.name);
        user.setRole(User.Role.counselor);
        user.setActive(true);
        user.setPassword(passwordEncoder.encode(req.password));
        user = userRepository.save(user);
        return userResponse(user);
    }

    @PostMapping("/users/{id}/role")
    public Map<String, Object> changeRole(@PathVariable Long id, @RequestBody ChangeRoleRequest req, HttpSession session) {
        auth.requireRole(session, User.Role.admin);
        if (req == null || req.role == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "role is required");
        }
        User user = userRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.setRole(req.role);
        user = userRepository.save(user);
        return userResponse(user);
    }

    @PostMapping("/users/{id}/active")
    public Map<String, Object> setActive(@PathVariable Long id, @RequestBody SetActiveRequest req, HttpSession session) {
        auth.requireRole(session, User.Role.admin);
        if (req == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "active is required");
        }
        User user = userRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(req.active);
        user = userRepository.save(user);
        return userResponse(user);
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public Map<String, Object> deleteUser(@PathVariable Long id, HttpSession session) {
        auth.requireRole(session, User.Role.admin);
        User user = userRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() == User.Role.patient) {
            Patient patient = patientRepository.findByUserId(user.getId()).orElse(null);
            if (patient != null) {
                moodEntryRepository.deleteByPatient(patient);
                appointmentRepository.deleteByPatient(patient);
                patientRepository.delete(patient);
            }
        }

        if (user.getRole() == User.Role.counselor) {
            appointmentRepository.deleteByCounselor(user);
            availabilityRepository.deleteByCounselor(user);
            for (Patient p : patientRepository.findByAssignedCounselor(user)) {
                p.setAssignedCounselor(null);
                patientRepository.save(p);
            }
        }

        userRepository.delete(user);
        return Map.of("ok", true);
    }

    private Map<String, Object> userResponse(User user) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", user.getId());
        resp.put("email", user.getEmail());
        resp.put("name", user.getName());
        resp.put("role", user.getRole());
        resp.put("active", user.isActive());
        resp.put("createdAt", user.getCreatedAt());
        return resp;
    }

    public static class ChangeRoleRequest {
        public User.Role role;
    }

    public static class SetActiveRequest {
        public boolean active;
    }

    public static class CreateUserRequest {
        public String email;
        public String password;
        public String name;
    }
}
