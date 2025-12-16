package com.example.mentalhealth.model;

import jakarta.persistence.*;

@Entity
@Table(name = "patients")
public class Patient {
    @Id
    private Long id;

    @OneToOne(optional = false)
    @MapsId
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "emergency_contact", length = 100)
    private String emergencyContact;

    @ManyToOne
    @JoinColumn(name = "assigned_counselor_id")
    private User assignedCounselor;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getEmergencyContact() {
        return emergencyContact;
    }

    public void setEmergencyContact(String emergencyContact) {
        this.emergencyContact = emergencyContact;
    }

    public User getAssignedCounselor() {
        return assignedCounselor;
    }

    public void setAssignedCounselor(User assignedCounselor) {
        this.assignedCounselor = assignedCounselor;
    }
}
