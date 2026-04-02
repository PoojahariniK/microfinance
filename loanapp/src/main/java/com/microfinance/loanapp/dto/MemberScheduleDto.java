package com.microfinance.loanapp.dto;

import lombok.Data;

@Data
public class MemberScheduleDto {
    private Long loanScheduleId;
    private Long memberId;
    private String memberName;
    private Double principal;
    private Double interest;
    private Double total;
    private Double paidAmount;
    private Integer installmentNo;
    private String dueDate;
    private String status;
}
