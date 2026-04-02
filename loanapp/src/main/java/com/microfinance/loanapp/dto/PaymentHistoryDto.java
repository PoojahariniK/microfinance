package com.microfinance.loanapp.dto;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PaymentHistoryDto {
    private Long paymentId;
    private Double amount;
    private LocalDate paymentDate;
    private String collectedBy;
}
