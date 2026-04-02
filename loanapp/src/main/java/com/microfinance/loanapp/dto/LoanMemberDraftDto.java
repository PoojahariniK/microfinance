package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanMemberDraftDto {
    private Long memberId;
    private String memberName;
    private Double principalAmount;
}


