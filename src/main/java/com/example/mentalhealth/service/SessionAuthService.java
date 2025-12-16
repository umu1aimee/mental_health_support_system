package com.example.mentalhealth.service;

import com.example.mentalhealth.exception.ApiException;
import com.example.mentalhealth.model.User;
import com.example.mentalhealth.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class SessionAuthService {
    public static final String SESSION_USER_ID = "USER_ID";

    private final UserRepository userRepository;

    public SessionAuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser(HttpSession session) {
        Object id = session.getAttribute(SESSION_USER_ID);
        if (!(id instanceof Long userId)) {
            return null;
        }
        return userRepository.findById(userId).orElse(null);
    }

    public User requireLogin(HttpSession session) {
        User user = getCurrentUser(session);
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        if (!user.isActive()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is deactivated");
        }
        return user;
    }

    public User requireRole(HttpSession session, User.Role role) {
        User user = requireLogin(session);
        if (user.getRole() != role) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return user;
    }

    public User requireAnyRole(HttpSession session, User.Role... roles) {
        User user = requireLogin(session);
        if (roles == null || roles.length == 0) {
            return user;
        }
        for (User.Role role : roles) {
            if (user.getRole() == role) {
                return user;
            }
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "Access denied");
    }
}
