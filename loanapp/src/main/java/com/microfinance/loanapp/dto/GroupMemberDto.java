package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupMemberDto {
    private Long id;
    private String name;
    private String phone;
    private String aadhaarNumber;
    private boolean activeInAnotherLoan;
}
