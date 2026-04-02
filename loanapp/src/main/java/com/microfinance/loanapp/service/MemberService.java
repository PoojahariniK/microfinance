package com.microfinance.loanapp.service;

import com.microfinance.loanapp.dto.*;
import com.microfinance.loanapp.enums.LoanStatus;
import com.microfinance.loanapp.enums.MemberStatus;
import com.microfinance.loanapp.enums.UserRole;
import com.microfinance.loanapp.exception.ApiException;
import com.microfinance.loanapp.model.Group;
import com.microfinance.loanapp.model.LoanMember;
import com.microfinance.loanapp.model.Member;
import com.microfinance.loanapp.model.MemberGroup;
import com.microfinance.loanapp.model.User;
import com.microfinance.loanapp.repository.GroupRepository;
import com.microfinance.loanapp.repository.LoanMemberRepository;
import com.microfinance.loanapp.repository.MemberGroupRepository;
import com.microfinance.loanapp.repository.MemberRepository;
import com.microfinance.loanapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final MemberGroupRepository memberGroupRepository;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final LoanMemberRepository loanMemberRepository;

    // ================= CREATE MEMBER =================
    public MemberResponse createMember(CreateMemberRequest request, org.springframework.web.multipart.MultipartFile file, String loggedInUser) {

        User user = validateUser(loggedInUser);
        validateAdmin(user);

        if (request.getName() == null || request.getName().isBlank())
            throw new ApiException(HttpStatus.BAD_REQUEST, "Name required");

        if (request.getPhone() == null || request.getPhone().isBlank())
            throw new ApiException(HttpStatus.BAD_REQUEST, "Phone required");

        if (request.getAddress() == null || request.getAddress().isBlank())
            throw new ApiException(HttpStatus.BAD_REQUEST, "Address required");

        if (request.getAadhaarNumber() == null || request.getAadhaarNumber().isBlank())
            throw new ApiException(HttpStatus.BAD_REQUEST, "Aadhaar required");

        if (memberRepository.existsByAadhaarNumber(request.getAadhaarNumber())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Aadhaar already exists");
        }

        Member member = new Member();

        member.setName(request.getName());
        member.setPhone(request.getPhone());
        member.setAddress(request.getAddress());
        member.setAadhaarNumber(request.getAadhaarNumber());

        member.setDob(request.getDob());
        member.setGender(request.getGender());
        member.setOccupation(request.getOccupation());

        member.setBankName(request.getBankName());
        member.setAccountNumber(request.getAccountNumber());
        member.setIfscCode(request.getIfscCode());

        member.setNomineeName(request.getNomineeName());
        member.setNomineeRelation(request.getNomineeRelation());
        member.setNomineePhone(request.getNomineePhone());

        member.setStatus(MemberStatus.ACTIVE);
        member.setCreatedAt(LocalDateTime.now());

        // Handle File
        if (file != null && !file.isEmpty()) {
            member.setPhotoPath(saveFile(file, null));
        }

        memberRepository.save(member);

        return mapToResponse(member);
    }

    // ================= UPDATE MEMBER + GROUP =================
    public MemberResponse updateMember(Long id, UpdateMemberRequest request, org.springframework.web.multipart.MultipartFile file, String loggedInUser) {

        User user = validateUser(loggedInUser);
        validateAdmin(user);

        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Member not found"));

        if (request.getAadhaarNumber() != null &&
                !request.getAadhaarNumber().equals(member.getAadhaarNumber())) {

            if (memberRepository.existsByAadhaarNumber(request.getAadhaarNumber())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Aadhaar already exists");
            }

            member.setAadhaarNumber(request.getAadhaarNumber());
        }
        // update fields
        if (request.getName()           != null) member.setName(request.getName());
        if (request.getPhone()          != null) member.setPhone(request.getPhone());
        if (request.getAddress()        != null) member.setAddress(request.getAddress());
        if (request.getDob()            != null) member.setDob(request.getDob());
        if (request.getGender()         != null) member.setGender(request.getGender());
        if (request.getOccupation()     != null) member.setOccupation(request.getOccupation());

        if (request.getBankName()       != null) member.setBankName(request.getBankName());
        if (request.getAccountNumber()  != null) member.setAccountNumber(request.getAccountNumber());
        if (request.getIfscCode()       != null) member.setIfscCode(request.getIfscCode());

        if (request.getNomineeName()    != null) member.setNomineeName(request.getNomineeName());
        if (request.getNomineeRelation()!= null) member.setNomineeRelation(request.getNomineeRelation());
        if (request.getNomineePhone()   != null) member.setNomineePhone(request.getNomineePhone());

        // status update (ACTIVE ↔ INACTIVE)
        if (request.getStatus() != null) {
            member.setStatus(request.getStatus());
        }

        // Handle File
        if (file != null && !file.isEmpty()) {
            member.setPhotoPath(saveFile(file, member.getPhotoPath()));
        }

        memberRepository.save(member);

        //  HANDLE GROUP UPDATE
        if (request.getGroupIds() != null) {

            List<MemberGroup> existingMappings =
                    memberGroupRepository.findByMember_IdAndStatus(member.getId(), MemberStatus.ACTIVE);

            List<Long> existingGroupIds = existingMappings.stream()
                    .map(mg -> mg.getGroup().getId())
                    .collect(Collectors.toList());

            // ADD NEW GROUPS
            for (Long groupId : request.getGroupIds()) {

                if (!existingGroupIds.contains(groupId)) {
                    addMemberToGroup(groupId, member.getId(), loggedInUser);
                }
            }

            // REMOVE OLD GROUPS
            for (MemberGroup mg : existingMappings) {

                if (!request.getGroupIds().contains(mg.getGroup().getId())) {
                    mg.setStatus(MemberStatus.INACTIVE);
                    memberGroupRepository.save(mg);
                }
            }
        }

        return mapToResponse(member);
    }

    // ================= GET ALL =================
    public List<MemberResponse> getAllMembers(String loggedInUser) {

        validateUser(loggedInUser);

        return memberRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ================= GET BY ID =================
    public MemberResponse getMemberById(Long id, String loggedInUser) {

        validateUser(loggedInUser);

        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Member not found"));

        return mapToResponse(member);
    }

    // ================= GET BY GROUP =================
    public List<MemberResponse> getMembersByGroup(Long groupId, String loggedInUser) {

        validateUser(loggedInUser);

        List<MemberGroup> mappings =
                memberGroupRepository.findByGroup_IdAndStatus(groupId, MemberStatus.ACTIVE);

        return mappings.stream()
                .map(MemberGroup::getMember)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ================= ADD MEMBER =================
    public ApiResponse addMemberToGroup(Long groupId, Long memberId, String loggedInUser) {

        User user = validateUser(loggedInUser);
        validateAdmin(user);

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Member not found"));

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Group not found"));

        MemberGroup existing = memberGroupRepository
                .findByMember_IdAndGroup_Id(memberId, groupId)
                .orElse(null);

        if (existing != null && existing.getStatus() == MemberStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Already in group");
        }

        MemberGroup mapping = existing != null ? existing : new MemberGroup();

        mapping.setMember(member);
        mapping.setGroup(group);
        mapping.setJoinedAt(LocalDateTime.now());
        mapping.setStatus(MemberStatus.ACTIVE);

        memberGroupRepository.save(mapping);

        return new ApiResponse("Added to group");
    }

    // ================= REMOVE MEMBER =================
    public ApiResponse removeMemberFromGroup(Long groupId, Long memberId, String loggedInUser) {

        User user = validateUser(loggedInUser);
        validateAdmin(user);

        MemberGroup mapping = memberGroupRepository
                .findByMember_IdAndGroup_Id(memberId, groupId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not found"));

        List<LoanMember> activeLoans = loanMemberRepository.findByMember_IdAndLoan_Status(memberId, LoanStatus.ACTIVE);

        List<String> activeLoanGroups = activeLoans.stream()
                .filter(lm -> lm.getLoan().getGroup().getId().equals(groupId))
                .map(lm -> lm.getLoan().getGroup().getGroupName())
                .distinct()
                .collect(Collectors.toList());

        if (!activeLoanGroups.isEmpty()) {
            String groupsStr = String.join(", ", activeLoanGroups);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Member is active in an active loan for group: " + groupsStr + ". Cannot remove from this group.");
        }

        mapping.setStatus(MemberStatus.INACTIVE);
        memberGroupRepository.save(mapping);

        return new ApiResponse("Removed from group");
    }

    // ================= MAP =================
    private MemberResponse mapToResponse(Member m) {

        MemberResponse dto = new MemberResponse();

        dto.setId(m.getId());
        dto.setName(m.getName());
        dto.setPhone(m.getPhone());
        dto.setAddress(m.getAddress());
        dto.setAadhaarNumber(m.getAadhaarNumber());

        dto.setDob(m.getDob());
        dto.setGender(m.getGender());
        dto.setOccupation(m.getOccupation());

        dto.setBankName(m.getBankName());
        dto.setAccountNumber(m.getAccountNumber());
        dto.setIfscCode(m.getIfscCode());

        dto.setNomineeName(m.getNomineeName());
        dto.setNomineeRelation(m.getNomineeRelation());
        dto.setNomineePhone(m.getNomineePhone());

        dto.setPhotoPath(m.getPhotoPath());
        dto.setStatus(m.getStatus());
        dto.setCreatedAt(m.getCreatedAt());

        //  ADD GROUP IDS
        List<Long> groupIds = memberGroupRepository
                .findByMember_IdAndStatus(m.getId(), MemberStatus.ACTIVE)
                .stream()
                .map(mg -> mg.getGroup().getId())
                .collect(Collectors.toList());

        dto.setGroupIds(groupIds);

        return dto;
    }

    private User validateUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void validateAdmin(User user) {
        if (user.getRole() != UserRole.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only admin allowed");
        }
    }

    private String saveFile(MultipartFile file, String existingPath) {
        try {
            String uploadDir = "./uploads/members";
            Path uploadPath = Paths.get(uploadDir);

            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Remove existing file if any
            if (existingPath != null) {
                Path oldFile = Paths.get(existingPath);
                Files.deleteIfExists(oldFile);
            }

            String fileExtension = "";
            String fileName = file.getOriginalFilename();
            if (fileName != null && fileName.contains(".")) {
                fileExtension = fileName.substring(fileName.lastIndexOf("."));
            }

            String newFileName = "member_" + UUID.randomUUID().toString() + "_" + System.currentTimeMillis() + fileExtension;
            Path filePath = uploadPath.resolve(newFileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            return "uploads/members/" + newFileName;
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save image: " + e.getMessage());
        }
    }

}