package com.example.mentalhealth.repository;

import com.example.mentalhealth.model.Availability;
import com.example.mentalhealth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AvailabilityRepository extends JpaRepository<Availability, Long> {
    List<Availability> findByCounselorOrderByDayOfWeekAscStartTimeAsc(User counselor);

    List<Availability> findByCounselorAndDayOfWeekOrderByStartTimeAsc(User counselor, Integer dayOfWeek);

    void deleteByCounselor(User counselor);
}
