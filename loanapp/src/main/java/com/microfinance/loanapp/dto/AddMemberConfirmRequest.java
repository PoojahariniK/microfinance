package com.microfinance.loanapp.dto;

import lombok.Data;

import java.util.List;

@Data
public class AddMemberConfirmRequest {
    private Long memberId;
    private Double principalAmount;
    private List<AddMemberScheduleDto> schedules;
}
