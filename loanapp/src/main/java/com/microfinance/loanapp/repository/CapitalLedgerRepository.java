package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.CapitalLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CapitalLedgerRepository extends JpaRepository<CapitalLedger, Long> {

    @Query("SELECT COALESCE(SUM(c.amount), 0.0) FROM CapitalLedger c")
    Double sumTotalCapital();

    @Query("SELECT COALESCE(SUM(c.amount), 0.0) FROM CapitalLedger c WHERE c.entryDate < :date")
    Double sumCapitalBefore(@Param("date") LocalDateTime date);

    @Query("SELECT COALESCE(SUM(c.amount), 0.0) FROM CapitalLedger c WHERE c.entryDate >= :startDate AND c.entryDate <= :endDate")
    Double sumCapitalBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    List<CapitalLedger> findAllByOrderByEntryDateDesc();

    List<CapitalLedger> findByEntryDateBetweenOrderByEntryDateDesc(LocalDateTime start, LocalDateTime end);
}
