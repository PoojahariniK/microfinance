package com.microfinance.loanapp.dto;

import java.time.LocalDate;

import lombok.Data;

@Data
public class EditPaymentRequest {
    private Long paymentId;
    private Double newAmount;
    private LocalDate paymentDate;
}
