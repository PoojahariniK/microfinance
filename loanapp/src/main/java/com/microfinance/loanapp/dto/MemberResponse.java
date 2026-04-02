package com.microfinance.loanapp.dto;

import com.microfinance.loanapp.enums.Gender;
import com.microfinance.loanapp.enums.MemberStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class MemberResponse {

    private Long id;
    private String name;
    private String phone;
    private String address;
    private String aadhaarNumber;

    private LocalDate dob;
    private Gender gender;
    private String occupation;

    private String bankName;
    private String accountNumber;
    private String ifscCode;

    private String nomineeName;
    private String nomineeRelation;
    private String nomineePhone;

    private String photoPath;
    private MemberStatus status;
    private LocalDateTime createdAt;
    private List<Long> groupIds;
}