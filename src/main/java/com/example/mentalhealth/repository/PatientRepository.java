package com.example.mentalhealth.repository;

import com.example.mentalhealth.model.Patient;
import com.example.mentalhealth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    Optional<Patient> findByUserId(Long userId);

    List<Patient> findByAssignedCounselor(User counselor);
}
