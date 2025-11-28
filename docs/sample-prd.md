# Product Requirements Document: User Profile Gamification

## 1. Overview
This document outlines the requirements for adding a new gamification system to the user profile page. The goal is to increase user engagement by rewarding users with badges and points for completing specific activities on the platform.

## 2. Goals
- Increase user retention and daily active users.
- Encourage users to explore more features of the platform.
- Create a more engaging and rewarding user experience.

## 3. User Stories
- As a user, I want to earn points for completing my profile so that I feel a sense of accomplishment.
- As a user, I want to see a list of available badges I can earn so that I know what to do next.
- As a user, I want to receive a "Pioneer" badge for being one of the first 1000 users to sign up.
- As a user, I want to receive a "Contributor" badge after my first pull request is merged on a rewarded project.
- As a user, I want my profile page to display the badges I've earned.

## 4. Functional Requirements

### 4.1. Points System
- Users should be awarded points for the following actions:
  - Completing their user profile (100 points).
  - Linking their XDC wallet (50 points).
  - Registering their first repository as a Pool Manager (200 points).
  - Funding a repository for the first time (150 points).
  - Claiming their first bounty (100 points).

### 4.2. Badge System
- A new database table is required to store badge information (`badges`) and another to track which users have earned which badges (`user_badges`).
- The system should support the following initial badges:
  - **Profile Pro:** Awarded when a user completes all fields in their profile.
  - **Wallet Wizard:** Awarded when a user links their XDC wallet.
  - **Pioneer:** Awarded to the first 1000 users who signed up (requires a backfill script).
  - **First Contribution:** Awarded when a user's first contribution is successfully rewarded.
- The user's profile page must be updated to display earned badges.

### 4.3. Backend Logic
- The backend needs new API endpoints to retrieve a user's points and earned badges.
- Logic must be added to the existing services to award points and badges when a user completes a required action (e.g., in the profile update service, the bounty claim service, etc.).

## 5. Non-Functional Requirements
- The system should be performant and not slow down the user profile page load time.
- All point and badge calculations should be processed asynchronously to avoid blocking user interactions.

## 6. Out of Scope
- A public leaderboard for user points.
- The ability for users to spend points.
- Customizable badges.
