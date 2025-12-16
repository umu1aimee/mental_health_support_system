package com.example.mentalhealth.config;

import com.example.mentalhealth.model.User;
import com.example.mentalhealth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Configuration
public class DefaultAdminBootstrap {
    @Bean
    public ApplicationRunner ensureDefaultAdmin(UserRepository userRepository,
                                               BCryptPasswordEncoder passwordEncoder,
                                               @Value("${mindcare.admin.email:}") String adminEmail,
                                               @Value("${mindcare.admin.password:}") String adminPassword,
                                               @Value("${mindcare.admin.name:}") String adminName) {
        return args -> {
            if (userRepository.findByRole(User.Role.admin).stream().findAny().isPresent()) {
                return;
            }

            String normalizedEmail = adminEmail == null ? null : adminEmail.trim().toLowerCase();
            if (normalizedEmail == null || normalizedEmail.isBlank()) {
                return;
            }

            if (userRepository.findByEmail(normalizedEmail).isPresent()) {
                return;
            }

            User admin = new User();
            admin.setEmail(normalizedEmail);
            admin.setName(adminName);
            admin.setRole(User.Role.admin);
            admin.setActive(true);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            userRepository.save(admin);
        };
    }
}
