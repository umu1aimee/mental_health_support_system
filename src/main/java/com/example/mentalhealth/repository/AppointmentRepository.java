package com.example.mentalhealth.repository;

import com.example.mentalhealth.model.Appointment;
import com.example.mentalhealth.model.Patient;
import com.example.mentalhealth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatientOrderByAppointmentDateAscAppointmentTimeAsc(Patient patient);

    List<Appointment> findByCounselorOrderByAppointmentDateAscAppointmentTimeAsc(User counselor);

    boolean existsByCounselorAndAppointmentDateAndAppointmentTimeAndStatusNot(User counselor, LocalDate appointmentDate, LocalTime appointmentTime, String status);

    void deleteByPatient(Patient patient);

    void deleteByCounselor(User counselor);
}
