package com.microfinance.loanapp.dto.report;

import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class ActivityReportDto {
    private List<RecentPaymentDto> payments;
    private List<RecentLoanDto> loans;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RecentPaymentDto {
        private String memberName;
        private double amount;
        private LocalDate date;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RecentLoanDto {
        private Long id;
        private String groupName;
        private LocalDate startDate;
    }
}
