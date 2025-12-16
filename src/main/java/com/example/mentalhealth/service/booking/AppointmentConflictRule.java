package com.example.mentalhealth.service.booking;

import com.example.mentalhealth.exception.ApiException;
import com.example.mentalhealth.repository.AppointmentRepository;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@Order(300)
public class AppointmentConflictRule implements AppointmentBookingRule {
    private final AppointmentRepository appointmentRepository;

    public AppointmentConflictRule(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    @Override
    public void validate(AppointmentBookingRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid request");
        }

        boolean conflict = appointmentRepository.existsByCounselorAndAppointmentDateAndAppointmentTimeAndStatusNot(
                request.counselor(),
                request.appointmentDate(),
                request.appointmentTime(),
                "canceled"
        );

        if (conflict) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Time slot already booked");
        }
    }
}
