package com.microfinance.loanapp.dto;

import com.microfinance.loanapp.enums.CollectionDay;
import com.microfinance.loanapp.enums.CollectionType;
import lombok.Data;

@Data
public class GroupCreateRequest {

    private String groupName;
    private CollectionType collectionType;
    private CollectionDay collectionDay;
    private Long collectionStaffId;
}