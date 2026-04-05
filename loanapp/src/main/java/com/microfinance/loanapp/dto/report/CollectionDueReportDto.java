package com.microfinance.loanapp.dto.report;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data @NoArgsConstructor @AllArgsConstructor
public class CollectionDueReportDto {
    private Summary summary;
    private List<InstallmentDto> installments;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class Summary {
        private double plannedDue;
        private double collected;
        private double pending;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class InstallmentDto {
        private String memberName;
        private Long loanId;
        private String loanStatus;
        private int installmentNo;
        private java.time.LocalDate dueDate;
        private double dueAmount;
        private double paid;
        private double balance;
        private String status; // STRICTLY: PAID, PARTIAL, UNPAID, OVERDUE
    }
}
