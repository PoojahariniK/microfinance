package com.microfinance.loanapp.service;

import com.microfinance.loanapp.dto.AddCapitalRequest;
import com.microfinance.loanapp.model.CapitalLedger;
import com.microfinance.loanapp.model.User;
import com.microfinance.loanapp.enums.UserStatus;
import com.microfinance.loanapp.enums.UserRole;
import com.microfinance.loanapp.exception.ApiException;
import com.microfinance.loanapp.repository.CapitalLedgerRepository;
import com.microfinance.loanapp.repository.UserRepository;
import org.springframework.http.HttpStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CapitalService {

    private final CapitalLedgerRepository capitalLedgerRepository;
    private final UserRepository userRepository;

    @Transactional
    public String addCapital(AddCapitalRequest request, String loggedInUser) {
        User user = userRepository.findByUsername(loggedInUser)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is disabled");
        }
        if (user.getRole() != UserRole.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only admins can infuse capital into the vault");
        }

        if (request.getAmount() == null || request.getAmount() <= 0) {
            throw new RuntimeException("Capital amount must be greater than zero");
        }

        CapitalLedger ledger = new CapitalLedger();
        ledger.setAmount(request.getAmount());
        ledger.setNotes(request.getNotes());
        ledger.setEntryDate(request.getEntryDate() != null ? request.getEntryDate() : LocalDateTime.now());
        ledger.setCreatedAt(LocalDateTime.now());
        ledger.setCreatedBy(loggedInUser);

        capitalLedgerRepository.save(ledger);
        return "SUCCESS";
    }

    public List<CapitalLedger> getCapitalEntries(LocalDate startDate, LocalDate endDate, String loggedInUser) {
        User user = userRepository.findByUsername(loggedInUser)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getRole() != UserRole.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only admins can view capital ledger");
        }

        if (startDate != null && endDate != null) {
            return capitalLedgerRepository.findByEntryDateBetweenOrderByEntryDateDesc(
                    startDate.atStartOfDay(), endDate.plusDays(1).atStartOfDay()
            );
        }
        return capitalLedgerRepository.findAllByOrderByEntryDateDesc();
    }

    @Transactional
    public String editCapital(Long id, AddCapitalRequest request, String loggedInUser) {
        User user = userRepository.findByUsername(loggedInUser)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is disabled");
        }
        if (user.getRole() != UserRole.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only admins can modify capital bounds");
        }

        CapitalLedger ledger = capitalLedgerRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Capital Ledger record not found"));

        if (request.getAmount() != null) {
            if (request.getAmount() <= 0) {
                throw new RuntimeException("Capital amount must be greater than zero");
            }
            ledger.setAmount(request.getAmount());
        }

        if (request.getNotes() != null) {
            ledger.setNotes(request.getNotes());
        }

        if (request.getEntryDate() != null) {
            ledger.setEntryDate(request.getEntryDate());
        }

        capitalLedgerRepository.save(ledger);
        return "Capital successfully updated";
    }
}
