package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddMemberScheduleDto {
    private Integer installmentNo;
    private LocalDate dueDate;
    private Double principal;
    private Double interest;
    private Double total;
}
