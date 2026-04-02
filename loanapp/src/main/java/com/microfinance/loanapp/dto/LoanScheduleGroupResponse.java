package com.microfinance.loanapp.dto;

import java.util.List;

import lombok.Data;

@Data
public class LoanScheduleGroupResponse {
    private Long loanId;
    private Integer installmentNo;
    private String dueDate;
    private List<MemberScheduleDto> members;
}