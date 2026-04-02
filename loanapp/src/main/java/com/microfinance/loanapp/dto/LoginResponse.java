package com.microfinance.loanapp.dto;

import com.microfinance.loanapp.enums.UserRole;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private String username;
    private String name;
    private String phone;
    private String address;
    private UserRole role;
    private String message;
}
