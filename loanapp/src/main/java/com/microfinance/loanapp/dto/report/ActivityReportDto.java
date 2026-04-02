package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActivityReportDto {
    private List<RecentPaymentDto> payments;
    private List<RecentLoanDto> loans;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RecentPaymentDto {
        private String memberName;
        private Double amount;
        private LocalDate date;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RecentLoanDto {
        private Long id;
        private String groupName;
        private LocalDate startDate;
    }
}
