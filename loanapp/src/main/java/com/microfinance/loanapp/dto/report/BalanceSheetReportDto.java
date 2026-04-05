package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class BalanceSheetReportDto {
    private Section opening;
    private Movement movement;
    private Section closing;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class Section {
        private double cash;
        private double loanOutstanding;
        private double charges;
        private double total;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class Movement {
        private double disbursed;
        private double collected;
        private double chargesCollected;
        private double infusedCapital;
    }
}
