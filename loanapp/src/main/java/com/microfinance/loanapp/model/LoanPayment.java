package com.microfinance.loanapp.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "loan_payment",
    indexes = {
        @Index(name = "idx_schedule", columnList = "loan_schedule_id"),
        @Index(name = "idx_collector", columnList = "collected_by_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoanPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_schedule_id", nullable = false)
    private LoanSchedule loanSchedule;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private LocalDate paymentDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collected_by_id", nullable = false)
    private User collectedBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}