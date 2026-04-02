package com.microfinance.loanapp.service;

import com.microfinance.loanapp.dto.*;
import com.microfinance.loanapp.enums.CollectionType;
import com.microfinance.loanapp.enums.GroupStatus;
import com.microfinance.loanapp.enums.UserRole;
import com.microfinance.loanapp.enums.UserStatus;
import com.microfinance.loanapp.exception.ApiException;
import com.microfinance.loanapp.model.Group;
import com.microfinance.loanapp.model.User;
import com.microfinance.loanapp.repository.GroupRepository;
import com.microfinance.loanapp.repository.UserRepository;
import com.microfinance.loanapp.repository.MemberGroupRepository;
import com.microfinance.loanapp.repository.LoanMemberRepository;
import com.microfinance.loanapp.enums.LoanStatus;
import com.microfinance.loanapp.enums.MemberStatus;
import com.microfinance.loanapp.model.Member;
import com.microfinance.loanapp.model.MemberGroup;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final MemberGroupRepository memberGroupRepository;
    private final LoanMemberRepository loanMemberRepository;

    // CREATE GROUP (ADMIN ONLY)
    @Transactional
    public GroupResponse createGroup(GroupCreateRequest request, String loggedInUser) {

        User user = validateAndGetUser(loggedInUser);

        if (user.getRole() != UserRole.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only admin can create group");
        }

        if (groupRepository.existsByGroupName(request.getGroupName())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Group name already exists");
        }
        if (request.getCollectionType() == CollectionType.WEEKLY ||
                request.getCollectionType() == CollectionType.BIWEEKLY) {

            if (request.getCollectionDay() == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Collection day is required");
            }
        } else {
            request.setCollectionDay(null);
        }


        Group group = new Group();
        group.setGroupName(request.getGroupName());
        group.setCollectionType(request.getCollectionType());
        group.setCollectionDay(request.getCollectionDay());
        User staff = userRepository.findById(request.getCollectionStaffId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Staff not found"));
        group.setCollectionStaff(staff);
        group.setStatus(GroupStatus.ACTIVE);
        group.setCreatedAt(LocalDateTime.now());

        groupRepository.save(group);

        return mapToResponse(group);
    }

    // GET ALL GROUPS
    public List<GroupResponse> getAllGroups(String loggedInUser) {

        validateAndGetUser(loggedInUser);

        return groupRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // GET GROUP MEMBERS
    public List<GroupMemberDto> getGroupMembers(Long groupId, boolean activeOnly, String loggedInUser) {
        validateAndGetUser(loggedInUser);

        List<MemberGroup> memberGroups;
        if (activeOnly) {
            memberGroups = memberGroupRepository.findByGroup_IdAndStatus(groupId, MemberStatus.ACTIVE);
        } else {
            // we assume a method exists or we filter manually, let's filter manually if we don't know
            memberGroups = memberGroupRepository.findAll().stream()
                    .filter(mg -> mg.getGroup().getId().equals(groupId))
                    .collect(Collectors.toList());
        }

        return memberGroups.stream()
                .map(mg -> {
                    Member m = mg.getMember();
                    boolean activeInAnotherLoan = loanMemberRepository.existsByMember_IdAndLoan_Status(m.getId(), LoanStatus.ACTIVE);
                    return new GroupMemberDto(
                            m.getId(),
                            m.getName(),
                            m.getPhone(),
                            m.getAadhaarNumber(),
                            activeInAnotherLoan
                    );
                })
                .collect(Collectors.toList());
    }

    // UPDATE GROUP (ADMIN or INCHARGE STAFF)
    @Transactional
    public GroupResponse updateGroup(Long id, GroupUpdateRequest request, String loggedInUser) {

        User user = validateAndGetUser(loggedInUser);
        Group group = getGroupById(id);

        boolean isAdmin = user.getRole() == UserRole.ADMIN;
        boolean isIncharge = group.getCollectionStaff().getId().equals(user.getId());
        if (!isAdmin && !isIncharge) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not allowed to update this group");
        }
        CollectionType type = request.getCollectionType();
        if (type != null) {

            if (type == CollectionType.WEEKLY || type == CollectionType.BIWEEKLY) {

                if (request.getCollectionDay() == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Collection day is required");
                }

            } else {
                request.setCollectionDay(null);
            }

            group.setCollectionType(type);
            group.setCollectionDay(request.getCollectionDay());
        }

        group.setGroupName(request.getGroupName());
        group.setCollectionType(request.getCollectionType());
        group.setCollectionDay(request.getCollectionDay());
        if (request.getCollectionStaffId() != null) {
            User staff = userRepository.findById(request.getCollectionStaffId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Staff not found"));

            group.setCollectionStaff(staff);
        }

        // ONLY ADMIN can change status
        if (isAdmin && request.getStatus() != null) {
            group.setStatus(request.getStatus());
        }

        groupRepository.save(group);

        return mapToResponse(group);
    }



    // ================= HELPER METHODS =================

    private User validateAndGetUser(String username) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is disabled");
        }

        return user;
    }

    private Group getGroupById(Long id) {
        return groupRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Group not found"));
    }

    private GroupResponse mapToResponse(Group group) {

        GroupResponse dto = new GroupResponse();
        dto.setId(group.getId());
        dto.setGroupName(group.getGroupName());
        dto.setCollectionType(group.getCollectionType());
        dto.setCollectionDay(group.getCollectionDay());
        dto.setCollectionStaff(group.getCollectionStaff().getUsername());        dto.setStatus(group.getStatus());
        dto.setCreatedAt(group.getCreatedAt());

        return dto;
    }
}