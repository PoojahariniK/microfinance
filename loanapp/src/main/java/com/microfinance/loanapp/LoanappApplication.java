package com.microfinance.loanapp;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import com.microfinance.loanapp.enums.UserRole;
import com.microfinance.loanapp.enums.UserStatus;
import com.microfinance.loanapp.model.User;
import com.microfinance.loanapp.repository.UserRepository;

@SpringBootApplication
public class LoanappApplication {

	public static void main(String[] args) {
		SpringApplication.run(LoanappApplication.class, args);
	}
	
	

}
