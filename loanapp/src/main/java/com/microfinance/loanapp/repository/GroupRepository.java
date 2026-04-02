package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.Group;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, Long> {

    boolean existsByGroupName(String groupName);

    Optional<Group> findByGroupName(String groupName);
}