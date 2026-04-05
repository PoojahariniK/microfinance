package com.microfinance.loanapp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(
    name = "loan_member",
    uniqueConstraints = @UniqueConstraint(columnNames = {"loan_id", "member_id"}),
    indexes = {
        @Index(name = "idx_lm_loan_id", columnList = "loan_id"),
        @Index(name = "idx_lm_joined_date", columnList = "joinedDate")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoanMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id", nullable = false)
    private Loan loan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private Double principalAmount;

    @Column(nullable = false)
    private LocalDate joinedDate;
}
