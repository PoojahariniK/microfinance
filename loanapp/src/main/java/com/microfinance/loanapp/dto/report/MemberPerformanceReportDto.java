package com.microfinance.loanapp.dto.report;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data @NoArgsConstructor @AllArgsConstructor
public class MemberPerformanceReportDto {
    private String memberName;
    private String groupName;
    private int activeLoans;
    private double totalLoan;
    private double paid;
    private double pending;
    private int overdueCount;
    private String status; // GOOD, RISK, DEFAULT
    private List<MemberLoanDetailDto> loans;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class MemberLoanDetailDto {
        private Long loanId;
        private double total;
        private double paid;
        private double pending;
        private int overdues;
        private String status; // ACTIVE, COMPLETED
    }
}
