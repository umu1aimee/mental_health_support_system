package com.example.mentalhealth.repository;

import com.example.mentalhealth.model.MoodEntry;
import com.example.mentalhealth.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MoodEntryRepository extends JpaRepository<MoodEntry, Long> {
    List<MoodEntry> findByPatientOrderByEntryDateAsc(Patient patient);

    Optional<MoodEntry> findByPatientAndEntryDate(Patient patient, LocalDate entryDate);

    void deleteByPatient(Patient patient);
}
