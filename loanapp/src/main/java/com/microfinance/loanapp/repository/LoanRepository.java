package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.enums.LoanStatus;
import com.microfinance.loanapp.model.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanRepository extends JpaRepository<Loan, Long> {
    Optional<Loan> findByGroup_IdAndStatus(Long groupId, LoanStatus status);
    org.springframework.data.domain.Page<Loan> findByGroup_Id(Long groupId, org.springframework.data.domain.Pageable pageable);
    List<Loan> findByGroup_Id(Long groupId);
    long countByStatus(LoanStatus status);

    @org.springframework.data.jpa.repository.Query(
        "SELECT l FROM Loan l WHERE " +
        "LOWER(l.group.groupName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
        "CAST(l.id AS string) LIKE CONCAT('%', :search, '%')")
    org.springframework.data.domain.Page<Loan> searchLoans(
        @org.springframework.data.repository.query.Param("search") String search,
        org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
        "SELECT l FROM Loan l WHERE l.group.id = :groupId AND (" +
        "LOWER(l.group.groupName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
        "CAST(l.id AS string) LIKE CONCAT('%', :search, '%'))")
    org.springframework.data.domain.Page<Loan> searchLoansByGroup(
        @org.springframework.data.repository.query.Param("groupId") Long groupId,
        @org.springframework.data.repository.query.Param("search") String search,
        org.springframework.data.domain.Pageable pageable);
}
