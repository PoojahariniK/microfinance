package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    boolean existsByAadhaarNumber(String aadhaarNumber);

    Optional<Member> findByAadhaarNumber(String aadhaarNumber);
}