package com.microfinance.loanapp.dto;

import lombok.Data;

import java.util.List;

@Data
public class AddMemberConfirmRequest {
    private Long memberId;
    private Double principalAmount;
    private Double dueAmount;
    private List<AddMemberScheduleDto> schedules;
}
