# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-overview.spec.ts >> sign in and overview >> unauthenticated visitors are sent to sign in
- Location: tests\e2e\auth-overview.spec.ts:5:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Sign in', level: 1 })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Sign in', level: 1 })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e6]:
      - strong [ref=e7]: AtollFlow
      - text: Guesthouse operations
    - generic [ref=e8]: AGENCY CONTROL CENTER
    - navigation [ref=e9]:
      - link "Dashboard" [ref=e10] [cursor=pointer]:
        - /url: /agency
        - img [ref=e11]
        - text: Dashboard
      - link "Properties" [ref=e16] [cursor=pointer]:
        - /url: /agency/properties
        - img [ref=e17]
        - text: Properties
      - link "Guesthouse Scanner" [ref=e21] [cursor=pointer]:
        - /url: /agency/scanner
        - img [ref=e22]
        - text: Guesthouse Scanner
      - link "Unified Inbox" [ref=e29] [cursor=pointer]:
        - /url: /agency/conversations
        - img [ref=e30]
        - text: Unified Inbox
      - link "Tasks" [ref=e32] [cursor=pointer]:
        - /url: /agency/tasks
        - img [ref=e33]
        - text: Tasks
      - link "Reviews" [ref=e36] [cursor=pointer]:
        - /url: /agency/reviews
        - img [ref=e37]
        - text: Reviews
      - link "Property Brain" [ref=e39] [cursor=pointer]:
        - /url: /agency/property-brain
        - img [ref=e40]
        - text: Property Brain
    - generic [ref=e50]:
      - link "Settings" [ref=e51] [cursor=pointer]:
        - /url: /agency/settings
        - img [ref=e52]
        - text: Settings
      - button "Sign out" [ref=e55]:
        - img [ref=e56]
        - text: Sign out
  - main [ref=e59]:
    - generic [ref=e60]:
      - navigation "Breadcrumb" [ref=e62]: Overview
      - generic "Demo Operator" [ref=e64]: DO
    - generic [ref=e65]:
      - generic [ref=e66]:
        - text: Demo · no live Supabase connection
        - button "Hide demo notice" [pressed] [ref=e67]
      - generic [ref=e69]:
        - navigation "Breadcrumb" [ref=e70]:
          - link "Overview" [ref=e71] [cursor=pointer]:
            - /url: /agency
        - heading "Agency overview" [level=1] [ref=e72]
        - paragraph [ref=e73]: Priorities, enquiries, approvals, and activity.
      - generic [ref=e75]:
        - navigation "Breadcrumb" [ref=e76]:
          - link "Overview" [ref=e77] [cursor=pointer]:
            - /url: /agency
        - heading "Agency overview" [level=1] [ref=e78]
        - paragraph [ref=e79]: Priorities, enquiries, approvals, and activity.
      - generic [ref=e80]:
        - generic [ref=e81]:
          - generic [ref=e82]:
            - button "Refresh" [ref=e83]:
              - generic [ref=e84]:
                - img [ref=e85]
                - text: Refresh
            - button "Open full overview" [ref=e90]:
              - generic [ref=e91]:
                - img [ref=e92]
                - text: Open full overview
          - generic [ref=e95]:
            - tablist [ref=e96]:
              - tab "Priorities" [selected] [ref=e97]
              - tab "Enquiries" [ref=e98]
              - tab "Approvals" [ref=e99]
              - tab "Overdue tasks" [ref=e100]
              - tab "Activity" [ref=e101]
            - tabpanel "Priorities" [ref=e102]:
              - generic [ref=e103]:
                - generic [ref=e104]: HIGH PRIORITY
                - generic [ref=e105]:
                  - generic [ref=e107]:
                    - img [ref=e109]
                    - generic [ref=e111]:
                      - generic [ref=e112]:
                        - generic [ref=e113]: Urgent enquiry from the Champlain Guesthouse
                        - generic [ref=e114]:
                          - status "urgent" [ref=e115]:
                            - text: Urgent
                            - generic [ref=e116]: urgent
                          - status "awaiting-reply" [ref=e117]:
                            - text: Awaiting reply
                            - generic [ref=e118]: awaiting-reply
                      - paragraph [ref=e119]: Check-in change request from Mrs. Reinhardt and Mr. Heinrich. They are arriving on June 20 at 10:00.
                      - paragraph [ref=e120]: Due in 2 days · 4 messages
                  - generic [ref=e122]:
                    - img [ref=e124]
                    - generic [ref=e126]:
                      - generic [ref=e127]:
                        - generic [ref=e128]: "Check-in change: Nereidas Road - Kuda Hey"
                        - status "urgent" [ref=e130]:
                          - text: Urgent
                          - generic [ref=e131]: urgent
                      - paragraph [ref=e132]: Check-in time moved from 12:00 to 15:00 for the family staying June 23.
                      - paragraph [ref=e133]: Due tomorrow · 1 message
                  - generic [ref=e135]:
                    - img [ref=e137]
                    - generic [ref=e139]:
                      - generic [ref=e140]:
                        - generic [ref=e141]: Check-in change request from Meandarra Boutique
                        - status "awaiting-reply" [ref=e143]:
                          - text: Awaiting reply
                          - generic [ref=e144]: awaiting-reply
                      - paragraph [ref=e145]: Guest requested early check-in for June 25. Property manager needs to confirm.
                      - paragraph [ref=e146]: Due in 3 days · 2 messages
                - button "View all priorities" [ref=e148]
            - tabpanel "Enquiries"
            - tabpanel "Approvals"
            - tabpanel "Overdue tasks"
            - tabpanel "Activity"
        - complementary [ref=e149]:
          - generic [ref=e151]:
            - generic [ref=e152]: QUICK STATS
            - generic [ref=e153]:
              - generic [ref=e154]:
                - generic [ref=e155]: Properties
                - generic [ref=e156]: "12"
                - generic [ref=e157]: +2 this month
              - generic [ref=e158]:
                - generic [ref=e159]: Active enquiries
                - generic [ref=e160]: "7"
                - generic [ref=e161]: "-1 since yesterday"
              - generic [ref=e162]:
                - generic [ref=e163]: Pending approvals
                - generic [ref=e164]: "3"
                - generic [ref=e165]: +1 from AI
              - generic [ref=e166]:
                - generic [ref=e167]: Overdue tasks
                - generic [ref=e168]: "4"
                - generic [ref=e169]: Due today
          - generic [ref=e171]:
            - generic [ref=e172]: STAFF ONBOARDING
            - generic [ref=e173]:
              - generic [ref=e174]:
                - img [ref=e176]
                - generic [ref=e179]:
                  - paragraph [ref=e180]:
                    - strong [ref=e181]: Ananya
                  - paragraph [ref=e182]: Assistant Manager · Champlain Guesthouse
              - generic [ref=e183]:
                - img [ref=e185]
                - generic [ref=e188]:
                  - paragraph [ref=e189]:
                    - strong [ref=e190]: Tashi
                  - paragraph [ref=e191]: Property Owner · Nereidas Road - Kuda Hey
          - generic [ref=e193]:
            - generic [ref=e194]: SYSTEM STATUS
            - generic [ref=e195]:
              - generic [ref=e199]:
                - paragraph [ref=e200]: Supabase connection
                - paragraph [ref=e201]: Demo mode · no live connection
              - generic [ref=e205]:
                - paragraph [ref=e206]: AI approval queue
                - paragraph [ref=e207]: 3 pending approvals · UI only
              - generic [ref=e211]:
                - paragraph [ref=e212]: Property Brain
                - paragraph [ref=e213]: Verified knowledge ready
      - status [ref=e214]:
        - text: Demo · no live Supabase connection
        - button "Hide demo notice" [pressed] [ref=e215]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { signIn } from './fixtures';
  3  | 
  4  | test.describe('sign in and overview', () => {
  5  |   test('unauthenticated visitors are sent to sign in', async ({ page }) => {
  6  |     await page.goto('/');
  7  |     await expect(
  8  |       page.getByRole('heading', { level: 1, name: 'Sign in' }),
> 9  |     ).toBeVisible();
     |       ^ Error: expect(locator).toBeVisible() failed
  10 |   });
  11 | 
  12 |   test('signing in shows the overview with live counts', async ({ page }) => {
  13 |     await signIn(page);
  14 |     await expect(
  15 |       page.getByRole('heading', { level: 1, name: 'Overview' }),
  16 |     ).toBeVisible();
  17 |     for (const metric of [
  18 |       'Properties',
  19 |       'Open enquiries',
  20 |       'Unread enquiries',
  21 |       'Overdue tasks',
  22 |       'Pending approvals',
  23 |       'Integration health',
  24 |     ]) {
  25 |       await expect(
  26 |         page.getByRole('heading', { level: 3, name: metric }),
  27 |       ).toBeVisible();
  28 |     }
  29 |     await expect(page.getByText('Across your organizations')).toBeVisible();
  30 |   });
  31 | });
  32 | 
```