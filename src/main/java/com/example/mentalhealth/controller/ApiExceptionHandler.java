package com.example.mentalhealth.controller;

import com.example.mentalhealth.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
        String msg = ex.getMessage() == null ? "Error" : ex.getMessage();
        HttpStatus status = ex.getStatus() == null ? HttpStatus.BAD_REQUEST : ex.getStatus();
        return ResponseEntity.status(status).body(Map.of(
                "error", msg
        ));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        String msg = ex.getMessage() == null ? "Error" : ex.getMessage();

        HttpStatus status = HttpStatus.BAD_REQUEST;
        if (msg.toLowerCase().contains("not authenticated")) {
            status = HttpStatus.UNAUTHORIZED;
        } else if (msg.toLowerCase().contains("access denied")) {
            status = HttpStatus.FORBIDDEN;
        } else if (msg.toLowerCase().contains("invalid credentials")) {
            status = HttpStatus.UNAUTHORIZED;
        }

        return ResponseEntity.status(status).body(Map.of(
                "error", msg
        ));
    }
}
