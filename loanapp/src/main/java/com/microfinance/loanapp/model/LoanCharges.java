package com.microfinance.loanapp.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "loan_charges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoanCharges {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id", nullable = false, unique = true)
    private Loan loan;

    private Double processingFee;

    private Double documentFee;

    private Double insuranceFee;

    private Double savingAmount;
}
