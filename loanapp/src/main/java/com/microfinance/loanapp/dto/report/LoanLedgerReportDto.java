package com.microfinance.loanapp.dto.report;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data @NoArgsConstructor @AllArgsConstructor
public class LoanLedgerReportDto {
    private String memberName;
    private int installmentNo;
    private LocalDate dueDate;
    private double principal;
    private double interest;
    private double paid;
    private double balance;
    private String status;
    private Long loanId;
    private String groupName;
}
