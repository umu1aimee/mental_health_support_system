package com.example.mentalhealth.repository;

import com.example.mentalhealth.model.ProfileChange;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProfileChangeRepository extends JpaRepository<ProfileChange, Long> {
    List<ProfileChange> findTop20ByOrderByCreatedAtDesc();
}


