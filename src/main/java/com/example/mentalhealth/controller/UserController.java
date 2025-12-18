package com.example.mentalhealth.controller;

import com.example.mentalhealth.exception.ApiException;
import com.example.mentalhealth.model.Patient;
import com.example.mentalhealth.model.ProfileChange;
import com.example.mentalhealth.model.User;
import com.example.mentalhealth.repository.PatientRepository;
import com.example.mentalhealth.repository.ProfileChangeRepository;
import com.example.mentalhealth.repository.UserRepository;
import com.example.mentalhealth.service.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {
    private final SessionAuthService auth;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final ProfileChangeRepository profileChangeRepository;

    public UserController(SessionAuthService auth,
                          UserRepository userRepository,
                          PatientRepository patientRepository,
                          ProfileChangeRepository profileChangeRepository) {
        this.auth = auth;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.profileChangeRepository = profileChangeRepository;
    }

    @GetMapping("/profile")
    public Map<String, Object> getProfile(HttpSession session) {
        User me = auth.requireLogin(session);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", me.getId());
        resp.put("email", me.getEmail());
        resp.put("name", me.getName());
        resp.put("role", me.getRole());
        resp.put("specialty", me.getSpecialty());

        if (me.getRole() == User.Role.patient) {
            Patient p = patientRepository.findByUserId(me.getId()).orElse(null);
            if (p != null) {
                resp.put("emergencyContact", p.getEmergencyContact());
            }
        }
        return resp;
    }

    @PutMapping("/profile")
    public Map<String, Object> updateProfile(@RequestBody UpdateProfileRequest req, HttpSession session) {
        User me = auth.requireLogin(session);
        if (req == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Request body is required");
        }

        boolean changed = false;

        if (req.name != null && !req.name.isBlank() && !req.name.equals(me.getName())) {
            me.setName(req.name.trim());
            changed = true;
        }

        if (me.getRole() == User.Role.counselor && req.specialty != null) {
            String trimmed = req.specialty.trim();
            if (!trimmed.equals(me.getSpecialty() == null ? "" : me.getSpecialty())) {
                me.setSpecialty(trimmed.isEmpty() ? null : trimmed);
                changed = true;
            }
        }

        if (me.getRole() == User.Role.patient && req.emergencyContact != null) {
            Patient p = patientRepository.findByUserId(me.getId()).orElseThrow(
                    () -> new ApiException(HttpStatus.BAD_REQUEST, "Patient profile not found"));
            String trimmed = req.emergencyContact.trim();
            if (!trimmed.equals(p.getEmergencyContact() == null ? "" : p.getEmergencyContact())) {
                p.setEmergencyContact(trimmed.isEmpty() ? null : trimmed);
                patientRepository.save(p);
                changed = true;
            }
        }

        if (changed) {
            me = userRepository.save(me);

            ProfileChange pc = new ProfileChange();
            pc.setUser(me);
            String who = me.getRole() + ":" + (me.getName() != null ? me.getName() : me.getEmail());
            pc.setDescription(who + " updated their profile");
            profileChangeRepository.save(pc);
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", me.getId());
        resp.put("email", me.getEmail());
        resp.put("name", me.getName());
        resp.put("role", me.getRole());
        resp.put("specialty", me.getSpecialty());

        if (me.getRole() == User.Role.patient) {
            Patient p = patientRepository.findByUserId(me.getId()).orElse(null);
            if (p != null) {
                resp.put("emergencyContact", p.getEmergencyContact());
            }
        }
        return resp;
    }

    public static class UpdateProfileRequest {
        public String name;
        public String specialty;
        public String emergencyContact;
    }
}

