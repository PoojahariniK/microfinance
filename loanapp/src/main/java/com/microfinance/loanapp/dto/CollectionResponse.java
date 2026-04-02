package com.microfinance.loanapp.dto;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class CollectionResponse {
    private Integer installmentNo;
    private LocalDate dueDate;
    private List<CollectionMemberDto> members;
}
