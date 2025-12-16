package com.example.mentalhealth.service.booking;

import com.example.mentalhealth.exception.ApiException;
import com.example.mentalhealth.model.User;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@Order(100)
public class CounselorEligibilityRule implements AppointmentBookingRule {
    @Override
    public void validate(AppointmentBookingRequest request) {
        if (request == null || request.counselor() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Counselor not found");
        }

        User counselor = request.counselor();
        if (counselor.getRole() != User.Role.counselor) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Selected user is not a counselor");
        }
        if (!counselor.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Counselor account is deactivated");
        }
    }
}
