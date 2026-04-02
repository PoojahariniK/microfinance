package com.microfinance.loanapp.model;

import com.microfinance.loanapp.enums.MemberStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "member_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MemberGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    private LocalDateTime joinedAt;
    @Enumerated(EnumType.STRING)
    private MemberStatus status; // ACTIVE / INACTIVE
}