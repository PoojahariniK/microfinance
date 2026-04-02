package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanConfirmRequest {
    private LoanDraftDto draft;
    private List<LoanSchedulePreviewDto> schedules;
}
