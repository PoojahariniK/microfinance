package com.microfinance.loanapp.dto;

import com.microfinance.loanapp.enums.Gender;
import com.microfinance.loanapp.enums.MemberStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateMemberRequest {

    private String name;

    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be exactly 10 digits")
    private String phone;

    private String address;

    @Pattern(regexp = "^[0-9]{12}$", message = "Aadhaar number must be exactly 12 digits")
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

    private List<Long> groupIds;

    private MemberStatus status;
}