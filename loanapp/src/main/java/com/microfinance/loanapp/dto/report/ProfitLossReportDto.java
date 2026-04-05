package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor
public class ProfitLossReportDto {
    private Revenue revenue;
    private double expenses;
    private double netProfit;
    private List<PeriodTrend> trends;
    private List<LoanProfitBreakdown> loanBreakdowns;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class Revenue {
        private double interest;
        private double charges;
        private double total;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class PeriodTrend {
        private String period;
        private double interest;
        private double charges;
        private double revenue;
        private Double growth; // Use Double for null support
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class LoanProfitBreakdown {
        private String groupName;
        private Long loanId;
        private double interestIncome;
        private double chargesIncome;
        private double profit;
        private double profitPercentage;
    }
}
