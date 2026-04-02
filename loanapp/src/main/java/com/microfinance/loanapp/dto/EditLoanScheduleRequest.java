package com.microfinance.loanapp.dto;

import java.util.List;

import lombok.Data;

@Data
public class EditLoanScheduleRequest {
    private Long loanId;
    private Integer installmentNo;
    private List<MemberScheduleEditDto> members;
}