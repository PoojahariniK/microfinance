package com.microfinance.loanapp.model;

import com.microfinance.loanapp.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(
    name = "loan_schedule",
    uniqueConstraints = @UniqueConstraint(columnNames = {"loan_member_id", "installment_no"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoanSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_member_id", nullable = false)
    private LoanMember loanMember;

    @Column(nullable = false)
    private Integer installmentNo;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false)
    private Double principal;

    @Column(nullable = false)
    private Double interest;

    @Column(nullable = false)
    private Double total;

    private Double paidAmount;

    private LocalDate paidDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;
}
