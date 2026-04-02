package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DueWiseReportDto {
    private LocalDate date;
    private Double totalDue;
    private Double totalCollected;
    private Double pending;
    private List<DueWiseMemberDto> members;
}
