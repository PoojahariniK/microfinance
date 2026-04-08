package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddMemberPreviewResponse {
    private Long loanId;
    private Long memberId;
    private String memberName;
    private Double principalAmount;
    private Double dueAmount;
    private Double expectedTotalPrincipal;
    private Double expectedTotalInterest;
    private Double expectedTotalObligation;
    private List<AddMemberScheduleDto> schedules;
}
