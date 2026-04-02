package com.microfinance.loanapp.dto;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class CollectPaymentRequest {
    private Long loanId;
    private Integer installmentNo;
    private LocalDate paymentDate;
    private List<PaymentEntryDto> payments;
}
