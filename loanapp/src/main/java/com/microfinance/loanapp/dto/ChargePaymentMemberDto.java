package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChargePaymentMemberDto {
    private Long memberId;
    private String memberName;
    private Double amountPaid;
    private LocalDate paymentDate;
}
