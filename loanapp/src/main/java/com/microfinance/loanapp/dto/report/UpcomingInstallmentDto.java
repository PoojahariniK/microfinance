package com.microfinance.loanapp.dto.report;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class UpcomingInstallmentDto {
    private String groupName;
    private int installmentNo;
    private LocalDate dueDate;
    private int pendingMembers;
}
