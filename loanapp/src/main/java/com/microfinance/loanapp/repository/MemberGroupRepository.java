package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.enums.MemberStatus;
import com.microfinance.loanapp.model.MemberGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberGroupRepository extends JpaRepository<MemberGroup, Long> {

    List<MemberGroup> findByGroup_Id(Long groupId);

    List<MemberGroup> findByGroup_IdAndStatus(Long groupId, MemberStatus status);

    List<MemberGroup> findByMember_IdAndStatus(Long memberId, MemberStatus status);

    Optional<MemberGroup> findByMember_IdAndGroup_Id(Long memberId, Long groupId);
}