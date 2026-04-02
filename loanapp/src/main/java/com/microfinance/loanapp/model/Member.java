package com.microfinance.loanapp.model;

import com.microfinance.loanapp.enums.Gender;
import com.microfinance.loanapp.enums.MemberStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String address;

    @Column(unique = true, nullable = false)
    private String aadhaarNumber;

    private LocalDate dob;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    private String occupation;

    private String bankName;

    private String accountNumber;

    private String ifscCode;

    private String nomineeName;

    private String nomineeRelation;

    private String nomineePhone;

    private String photoPath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}