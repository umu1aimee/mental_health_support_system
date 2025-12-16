package com.example.mentalhealth.controller;

import com.example.mentalhealth.model.Availability;
import com.example.mentalhealth.model.Patient;
import com.example.mentalhealth.model.User;
import com.example.mentalhealth.repository.AppointmentRepository;
import com.example.mentalhealth.repository.AvailabilityRepository;
import com.example.mentalhealth.repository.PatientRepository;
import com.example.mentalhealth.repository.UserRepository;
import com.example.mentalhealth.service.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.annotation.DirtiesContext;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PatientAppointmentBookingTest {

    private MockMvc mockMvc;
    @Autowired private WebApplicationContext webApplicationContext;
    @Autowired private UserRepository userRepository;
    @Autowired private PatientRepository patientRepository;
    @Autowired private AvailabilityRepository availabilityRepository;
    @Autowired private AppointmentRepository appointmentRepository;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @Test
    void bookAppointment_createsAppointment() throws Exception {
        User counselor = new User();
        counselor.setEmail("counselor@example.com");
        counselor.setPassword("x");
        counselor.setRole(User.Role.counselor);
        counselor.setActive(true);
        counselor = userRepository.save(counselor);

        User patientUser = new User();
        patientUser.setEmail("patient@example.com");
        patientUser.setPassword("x");
        patientUser.setRole(User.Role.patient);
        patientUser.setActive(true);
        patientUser = userRepository.save(patientUser);

        Patient patient = new Patient();
        patient.setUser(patientUser);
        patient.setEmergencyContact("911");
        patientRepository.save(patient);

        LocalDate date = LocalDate.of(2025, 1, 6);

        Availability availability = new Availability();
        availability.setCounselor(counselor);
        availability.setDayOfWeek(1);
        availability.setStartTime(LocalTime.of(9, 0));
        availability.setEndTime(LocalTime.of(17, 0));
        availabilityRepository.save(availability);

        HttpSession session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, patientUser.getId());

        mockMvc.perform(
                        post("/api/patient/appointments")
                                .session((MockHttpSession) session)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"counselorId\":" + counselor.getId() + ",\"appointmentDate\":\"" + date + "\",\"appointmentTime\":\"10:00\"}")
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("scheduled"));
    }

    @Test
    void bookAppointment_rejectsConflictingTimeSlot() throws Exception {
        User counselor = new User();
        counselor.setEmail("counselor2@example.com");
        counselor.setPassword("x");
        counselor.setRole(User.Role.counselor);
        counselor.setActive(true);
        counselor = userRepository.save(counselor);

        User patientUser = new User();
        patientUser.setEmail("patient2@example.com");
        patientUser.setPassword("x");
        patientUser.setRole(User.Role.patient);
        patientUser.setActive(true);
        patientUser = userRepository.save(patientUser);

        Patient patient = new Patient();
        patient.setUser(patientUser);
        patientRepository.save(patient);

        LocalDate date = LocalDate.of(2025, 1, 6);

        Availability availability = new Availability();
        availability.setCounselor(counselor);
        availability.setDayOfWeek(1);
        availability.setStartTime(LocalTime.of(9, 0));
        availability.setEndTime(LocalTime.of(17, 0));
        availabilityRepository.save(availability);

        var existing = new com.example.mentalhealth.model.Appointment();
        existing.setPatient(patient);
        existing.setCounselor(counselor);
        existing.setAppointmentDate(date);
        existing.setAppointmentTime(LocalTime.of(10, 0));
        existing.setStatus("scheduled");
        appointmentRepository.save(existing);

        HttpSession session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, patientUser.getId());

        mockMvc.perform(
                        post("/api/patient/appointments")
                                .session((MockHttpSession) session)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"counselorId\":" + counselor.getId() + ",\"appointmentDate\":\"" + date + "\",\"appointmentTime\":\"10:00\"}")
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Time slot already booked"));
    }
}
