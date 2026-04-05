package com.microfinance.loanapp.dto.report;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data @NoArgsConstructor @AllArgsConstructor
public class OutstandingOverdueReportDto {
    private String memberName;
    private String groupName;
    private Long loanId;
    private double pendingAmount;
    private int overdueCount;
    private LocalDate oldestDueDate;
    private String riskLevel; // LOW, MEDIUM, HIGH
    private String agingBucket; // 0-30 days, 30-60 days, 60+ days
}
