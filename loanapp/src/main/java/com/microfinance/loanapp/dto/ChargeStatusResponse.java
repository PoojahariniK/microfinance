package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChargeStatusResponse {
    private Integer totalMembers;
    private Integer paidMembers;
    private String status;
}
