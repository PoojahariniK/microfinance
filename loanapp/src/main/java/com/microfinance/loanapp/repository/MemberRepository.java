package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    boolean existsByAadhaarNumber(String aadhaarNumber);

    Optional<Member> findByAadhaarNumber(String aadhaarNumber);

    @org.springframework.data.jpa.repository.Query(
        "SELECT m FROM Member m WHERE " +
        "LOWER(m.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
        "m.phone LIKE CONCAT('%', :search, '%') OR " +
        "m.aadhaarNumber LIKE CONCAT('%', :search, '%')")
    org.springframework.data.domain.Page<Member> searchMembers(
        @org.springframework.data.repository.query.Param("search") String search,
        org.springframework.data.domain.Pageable pageable);
}