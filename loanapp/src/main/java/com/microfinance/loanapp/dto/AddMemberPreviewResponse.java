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
    private List<AddMemberScheduleDto> schedules;
}
