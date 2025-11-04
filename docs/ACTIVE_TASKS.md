# Active Tasks

Last updated: 2025-11-04

## High Priority
- [ ] Start Docker Desktop and Supabase local instance
- [ ] Apply migrations 20251103000006 (taste_profile schema) and 20251103000007 (recommendation function)
- [ ] Test complete 5-step onboarding flow in browser
- [ ] Verify taste profile data saves correctly to database
- [ ] Test curator recommendation algorithm with real/seeded data
- [ ] Verify conditional flow (listeners skip step 4, curators see all 5 steps)

## Medium Priority
- [ ] Add error handling for recommendation API failures
- [ ] Implement profile editing for existing users
- [ ] Add ability to update taste profile post-onboarding
- [ ] Test with multiple user accounts to verify recommendations work
- [ ] Add loading states during profile creation
- [ ] Test follow/unfollow in Step 5 recommendations

## Low Priority / Future
- [ ] A/B test recommendation algorithm weights (50/30/20 split)
- [ ] Add email verification flow
- [ ] Implement password reset functionality
- [ ] Consider adding "skip" option in Step 5 for users who want empty feed initially
- [ ] Add analytics to track onboarding completion rate
- [ ] Add "edit taste profile" page for updating genres/preferences later

## Recently Completed
- ✅ Created taste_profile database schema - 2025-11-04
- ✅ Created recommend_curators_for_user() function - 2025-11-04
- ✅ Built Step1Identity component - 2025-11-04
- ✅ Built Step2TasteDevelopment component (simplified, no manual rating) - 2025-11-04
- ✅ Built Step3CuratorChoice component - 2025-11-04
- ✅ Built Step4CurationStatement component - 2025-11-04
- ✅ Built Step5RecommendedCurators component - 2025-11-04
- ✅ Updated onboarding page with multi-step wizard and conditional flow - 2025-11-04
- ✅ Implemented automatic experience level determination - 2025-11-04
- ✅ Step 3: Infinite scroll feed pagination - 2025-11-03
- ✅ Step 2: Database-level genre filtering - 2025-11-03
- ✅ Step 1: Auto-populating genre stats - 2025-11-03

## Blocked
- None currently

## Notes
- Step 4 implementation complete but needs database migrations applied
- All UI components built and ready for testing
- Recommendation algorithm uses weighted scoring: genre overlap (50%), activity (30%), follower trust (20%)
- Experience levels start at 'discovering' and auto-update via existing trigger system from Steps 1-3
