package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DueWiseMemberDto {
    private String memberName;
    private String groupName;
    private Long loanId;
    private Integer dueNumber;
    private Double principal;
    private Double interest;
    private Double total;
    private Double paidAmount;
    private String status;
}
