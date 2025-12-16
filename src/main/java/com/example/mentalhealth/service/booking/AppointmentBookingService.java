package com.example.mentalhealth.service.booking;

import com.example.mentalhealth.exception.ApiException;
import com.example.mentalhealth.model.Appointment;
import com.example.mentalhealth.model.Patient;
import com.example.mentalhealth.model.User;
import com.example.mentalhealth.repository.AppointmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class AppointmentBookingService {
    private final AppointmentRepository appointmentRepository;
    private final List<AppointmentBookingRule> rules;

    public AppointmentBookingService(AppointmentRepository appointmentRepository, List<AppointmentBookingRule> rules) {
        this.appointmentRepository = appointmentRepository;
        this.rules = rules;
    }

    public Appointment bookAppointment(Patient patient, User counselor, LocalDate appointmentDate, LocalTime appointmentTime) {
        if (patient == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Patient profile not found");
        }
        if (counselor == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Counselor not found");
        }
        if (appointmentDate == null || appointmentTime == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "appointmentDate and appointmentTime are required");
        }

        AppointmentBookingRequest request = new AppointmentBookingRequest(patient, counselor, appointmentDate, appointmentTime);
        for (AppointmentBookingRule rule : rules) {
            rule.validate(request);
        }

        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setCounselor(counselor);
        appointment.setAppointmentDate(appointmentDate);
        appointment.setAppointmentTime(appointmentTime);
        appointment.setStatus("scheduled");

        return appointmentRepository.save(appointment);
    }
}
