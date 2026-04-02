package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EditMemberScheduleRequest {
    private Long loanId;
    private Long memberId;
    private List<MemberScheduleDto> schedules;
}
