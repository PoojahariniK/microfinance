package com.microfinance.loanapp.dto;

import com.microfinance.loanapp.enums.CollectionDay;
import com.microfinance.loanapp.enums.CollectionType;
import com.microfinance.loanapp.enums.GroupStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GroupResponse {

    private Long id;
    private String groupName;
    private CollectionType collectionType;
    private CollectionDay collectionDay;
    private String collectionStaff;
    private GroupStatus status;
    private LocalDateTime createdAt;
}