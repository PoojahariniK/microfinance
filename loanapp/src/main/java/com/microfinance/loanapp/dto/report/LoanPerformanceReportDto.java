package com.microfinance.loanapp.dto.report;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
@Data @NoArgsConstructor @AllArgsConstructor
public class LoanPerformanceReportDto {
    private Long loanId;
    private String groupName;
    private LocalDate startDate;
    private LocalDate endDate;
    private double total;
    private double collected;
    private double pending;
    private double completionPercentage;
    private String status; // ACTIVE, COMPLETED, DEFAULT RISK
}
