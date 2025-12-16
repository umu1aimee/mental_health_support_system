package com.example.mentalhealth.controller;

import com.example.mentalhealth.exception.ApiException;
import com.example.mentalhealth.model.Patient;
import com.example.mentalhealth.model.User;
import com.example.mentalhealth.repository.PatientRepository;
import com.example.mentalhealth.repository.UserRepository;
import com.example.mentalhealth.service.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PatientRepository patientRepository, BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> register(@RequestBody RegisterRequest req, HttpSession session) {
        if (req == null || req.email == null || req.email.isBlank() || req.password == null || req.password.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email and password are required");
        }

        if (req.role != null && req.role != User.Role.patient) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only patients can register. Counselors are created by admin.");
        }

        String normalizedEmail = req.email.trim().toLowerCase();
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setName(req.name);
        user.setRole(User.Role.patient);
        user.setActive(true);
        user.setPassword(passwordEncoder.encode(req.password));
        user = userRepository.save(user);

        if (user.getRole() == User.Role.patient) {
            Patient patient = new Patient();
            patient.setUser(user);
            patient.setEmergencyContact(req.emergencyContact);
            if (req.assignedCounselorId != null) {
                User counselor = userRepository.findById(req.assignedCounselorId)
                        .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Assigned counselor not found"));
                if (counselor.getRole() != User.Role.counselor) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Assigned counselor must have role=counselor");
                }
                patient.setAssignedCounselor(counselor);
            }
            patientRepository.save(patient);
        }

        session.setAttribute(SessionAuthService.SESSION_USER_ID, user.getId());
        return userResponse(user);
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest req, HttpSession session) {
        if (req == null || req.email == null || req.email.isBlank() || req.password == null || req.password.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email and password are required");
        }

        User user = userRepository.findByEmail(req.email.trim().toLowerCase())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!user.isActive()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is deactivated");
        }

        if (!passwordEncoder.matches(req.password, user.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        session.setAttribute(SessionAuthService.SESSION_USER_ID, user.getId());
        return userResponse(user);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpSession session) {
        session.invalidate();
        return Map.of("ok", true);
    }

    @GetMapping("/me")
    public Map<String, Object> me(HttpSession session) {
        Object id = session.getAttribute(SessionAuthService.SESSION_USER_ID);
        if (!(id instanceof Long userId)) {
            return Map.of("authenticated", false);
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return Map.of("authenticated", false);
        }
        Map<String, Object> resp = userResponse(user);
        resp.put("authenticated", true);
        return resp;
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

    public static class RegisterRequest {
        public String email;
        public String password;
        public String name;
        public User.Role role;

        public String emergencyContact;
        public Long assignedCounselorId;
    }

    public static class LoginRequest {
        public String email;
        public String password;
    }
}
