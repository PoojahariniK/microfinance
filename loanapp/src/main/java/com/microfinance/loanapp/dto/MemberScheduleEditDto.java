package com.microfinance.loanapp.dto;

import lombok.Data;

@Data
public class MemberScheduleEditDto {
    private Long loanScheduleId;
    private Double principal;
    private Double interest;
    private Double total;
}