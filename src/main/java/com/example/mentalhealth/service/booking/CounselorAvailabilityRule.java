package com.example.mentalhealth.service.booking;

import com.example.mentalhealth.exception.ApiException;
import com.example.mentalhealth.model.Availability;
import com.example.mentalhealth.repository.AvailabilityRepository;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Service
@Order(200)
public class CounselorAvailabilityRule implements AppointmentBookingRule {
    private final AvailabilityRepository availabilityRepository;

    public CounselorAvailabilityRule(AvailabilityRepository availabilityRepository) {
        this.availabilityRepository = availabilityRepository;
    }

    @Override
    public void validate(AppointmentBookingRequest request) {
        if (request == null || request.appointmentDate() == null || request.appointmentTime() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "appointmentDate and appointmentTime are required");
        }

        int dayOfWeek = toDayOfWeekInt(request.appointmentDate().getDayOfWeek());
        boolean withinAvailability = availabilityRepository
                .findByCounselorAndDayOfWeekOrderByStartTimeAsc(request.counselor(), dayOfWeek)
                .stream()
                .anyMatch(a -> isWithin(a, request.appointmentTime()));

        if (!withinAvailability) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Counselor not available at selected time");
        }
    }

    private boolean isWithin(Availability availability, LocalTime time) {
        if (availability.getStartTime() == null || availability.getEndTime() == null) {
            return false;
        }
        return !time.isBefore(availability.getStartTime()) && time.isBefore(availability.getEndTime());
    }

    private int toDayOfWeekInt(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case SUNDAY -> 0;
            case MONDAY -> 1;
            case TUESDAY -> 2;
            case WEDNESDAY -> 3;
            case THURSDAY -> 4;
            case FRIDAY -> 5;
            case SATURDAY -> 6;
        };
    }
}
