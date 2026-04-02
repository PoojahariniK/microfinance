package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanSummaryResponse {
    private Long id;
    private Long groupId;
    private String groupName;
    private Integer totalMembers;
    private Double totalPrincipal;
    private Double interestRate;
    private Integer durationMonths;
    private String collectionType;
    private String status;
    private LoanChargesDto charges;
    private String chargeStatus;
}
