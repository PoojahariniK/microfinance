package com.microfinance.loanapp.dto.report;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data @NoArgsConstructor @AllArgsConstructor
public class FinancialStatementReportDto {
    private Revenue revenue;
    private Portfolio portfolio;
    private List<LoanProfitDto> loanProfits;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class Revenue {
        private double interest;
        private double fees;
        private double total;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class Portfolio {
        private double capitalDisbursed;
        private double totalCollection;
        private double outstanding;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class LoanProfitDto {
        private Long loanId;
        private double interestEarned;
        private double principalRepaid;
        private String status;
    }
}
