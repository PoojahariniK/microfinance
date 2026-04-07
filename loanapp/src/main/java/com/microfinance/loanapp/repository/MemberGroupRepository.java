package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.enums.MemberStatus;
import com.microfinance.loanapp.model.MemberGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberGroupRepository extends JpaRepository<MemberGroup, Long> {

    List<MemberGroup> findByGroup_Id(Long groupId);


    org.springframework.data.domain.Page<MemberGroup> findByGroup_IdAndStatus(Long groupId, MemberStatus status, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
        "SELECT mg FROM MemberGroup mg WHERE mg.group.id = :groupId AND mg.status = :status AND (" +
        "LOWER(mg.member.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
        "mg.member.phone LIKE CONCAT('%', :search, '%') OR " +
        "mg.member.aadhaarNumber LIKE CONCAT('%', :search, '%'))")
    org.springframework.data.domain.Page<MemberGroup> searchInGroup(
        @org.springframework.data.repository.query.Param("groupId") Long groupId,
        @org.springframework.data.repository.query.Param("status") MemberStatus status,
        @org.springframework.data.repository.query.Param("search") String search,
        org.springframework.data.domain.Pageable pageable);

    List<MemberGroup> findByGroup_IdAndStatus(Long groupId, MemberStatus status);

    List<MemberGroup> findByMember_IdAndStatus(Long memberId, MemberStatus status);

    Optional<MemberGroup> findByMember_IdAndGroup_Id(Long memberId, Long groupId);
}