package com.microfinance.loanapp.controller;

import com.microfinance.loanapp.dto.AddCapitalRequest;
import com.microfinance.loanapp.service.CapitalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.microfinance.loanapp.model.CapitalLedger;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/capital")
@RequiredArgsConstructor
public class CapitalController {

    private final CapitalService capitalService;

    @PostMapping("/add")
    public ResponseEntity<String> addCapital(
            @RequestBody AddCapitalRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(capitalService.addCapital(request, loggedInUser));
    }

    @GetMapping
    public ResponseEntity<List<CapitalLedger>> getCapitalEntries(
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(capitalService.getCapitalEntries(startDate, endDate, loggedInUser));
    }

    @PutMapping("/{id}")
    public ResponseEntity<String> editCapital(
            @PathVariable Long id,
            @RequestBody AddCapitalRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(capitalService.editCapital(id, request, loggedInUser));
    }
}
