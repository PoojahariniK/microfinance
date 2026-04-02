package com.microfinance.loanapp.dto;

import lombok.Data;

@Data
public class CollectionMemberDto {
    private Long loanScheduleId;
    private String memberName;
    private Double principal;
    private Double interest;
    private Double charges;
    private Double totalDue;
    private Double paidAmount;
    private String status;
}
