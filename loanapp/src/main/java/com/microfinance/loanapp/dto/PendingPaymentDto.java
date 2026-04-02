package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PendingPaymentDto {
    private Long groupId;
    private String groupName;
    private Long loanId;
    private Integer installmentNo;
    private LocalDate dueDate;
    private Integer totalMembers;
    private Integer paidMembers;
    private Integer pendingMembers;
    private String status;
    private Boolean isOverdue;
}
