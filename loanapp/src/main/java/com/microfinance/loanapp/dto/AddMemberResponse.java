package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AddMemberResponse {
    private String message;
    private Long loanMemberId;
}
