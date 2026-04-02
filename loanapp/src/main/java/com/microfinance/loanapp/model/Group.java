package com.microfinance.loanapp.model;

import com.microfinance.loanapp.enums.CollectionDay;
import com.microfinance.loanapp.enums.CollectionType;
import com.microfinance.loanapp.enums.GroupStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "finance_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Group {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String groupName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CollectionType collectionType;

    @Enumerated(EnumType.STRING)
    private CollectionDay collectionDay; // nullable

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collection_staff_id", nullable = false)
    private User collectionStaff;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GroupStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}