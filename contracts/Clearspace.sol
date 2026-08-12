// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Clearspace {
    struct Profile {
        uint64 sessions;
        uint64 totalMinutes;
        uint64 checkIns;
        uint64 lastCheckInDay;
        uint64 lastSessionAt;
        uint32 bestDayMinutes;
        uint32 currentDayMinutes;
        uint64 currentFocusDay;
        uint16 streak;
    }

    mapping(address => Profile) private profiles;

    uint64 public globalSessions;
    uint64 public globalMinutes;
    uint64 public globalCheckIns;

    event SessionCompleted(address indexed user, uint16 minutesAmount, uint64 indexed day, uint64 sessionNumber);
    event DailyCheckIn(address indexed user, uint64 indexed day, uint16 streak);

    function completeSession(uint16 minutesAmount) external {
        require(minutesAmount > 0 && minutesAmount <= 180, "Minutes must be 1-180");

        uint64 today = uint64(block.timestamp / 1 days);
        Profile storage profile = profiles[msg.sender];

        if (profile.currentFocusDay != today) {
            profile.currentFocusDay = today;
            profile.currentDayMinutes = 0;
        }

        profile.sessions += 1;
        profile.totalMinutes += minutesAmount;
        profile.lastSessionAt = uint64(block.timestamp);
        profile.currentDayMinutes += minutesAmount;

        if (profile.currentDayMinutes > profile.bestDayMinutes) {
            profile.bestDayMinutes = profile.currentDayMinutes;
        }

        globalSessions += 1;
        globalMinutes += minutesAmount;

        emit SessionCompleted(msg.sender, minutesAmount, today, profile.sessions);
    }

    function dailyCheckIn() external {
        uint64 today = uint64(block.timestamp / 1 days);
        Profile storage profile = profiles[msg.sender];

        require(profile.lastCheckInDay != today, "Already checked in today");

        if (profile.lastCheckInDay + 1 == today) {
            profile.streak += 1;
        } else {
            profile.streak = 1;
        }

        profile.lastCheckInDay = today;
        profile.checkIns += 1;
        globalCheckIns += 1;

        emit DailyCheckIn(msg.sender, today, profile.streak);
    }

    function profileOf(address user) external view returns (Profile memory profile) {
        profile = profiles[user];
    }
}
