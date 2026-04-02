package com.microfinance.loanapp.dto;

import lombok.Data;

@Data
public class PaymentEntryDto {
    private Long loanScheduleId;
    private Double amount;
}