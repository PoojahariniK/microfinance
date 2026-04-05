package com.microfinance.loanapp.dto.report;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data @NoArgsConstructor @AllArgsConstructor
public class GroupPerformanceReportDto {
    private String groupName;
    private int memberCount;
    private int activeLoans;
    private double totalLoan;
    private double collected;
    private double pending;
    private double collectionPercentage;
    private String riskLevel; // LOW, MEDIUM, HIGH
    private List<LoanDetailDto> loans;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class LoanDetailDto {
        private Long loanId;
        private double total;
        private double collected;
        private double pending;
        private String status;
    }
}
