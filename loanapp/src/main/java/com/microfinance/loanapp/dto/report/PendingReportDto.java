package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PendingReportDto {
    private String memberName;
    private Long loanId;
    private Double pendingAmount;
    private Integer overdueCount;
}
