package com.microfinance.loanapp.dto;

import com.microfinance.loanapp.enums.CollectionDay;
import com.microfinance.loanapp.enums.CollectionType;
import com.microfinance.loanapp.enums.GroupStatus;
import lombok.Data;

@Data
public class GroupUpdateRequest {

    private String groupName;
    private CollectionType collectionType;
    private CollectionDay collectionDay;
    private Long collectionStaffId;
    private GroupStatus status;
}