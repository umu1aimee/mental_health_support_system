package com.example.mentalhealth.service.booking;

import com.example.mentalhealth.model.Patient;
import com.example.mentalhealth.model.User;

import java.time.LocalDate;
import java.time.LocalTime;

public record AppointmentBookingRequest(
        Patient patient,
        User counselor,
        LocalDate appointmentDate,
        LocalTime appointmentTime
) {
}
