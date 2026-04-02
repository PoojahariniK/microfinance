package com.microfinance.loanapp.dto;

import com.microfinance.loanapp.enums.UserRole;
import com.microfinance.loanapp.enums.UserStatus;
import lombok.Data;

@Data
public class UserResponse {
    private Long id;
    private String username;
    private String name;
    private String phone;
    private String address;
    private UserRole role;
    private UserStatus status;
}
