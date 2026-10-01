# Edjay's Life Organizer v3.7.1

Targeted reliability patch on top of V3.7.

- Same Android application ID: `com.edjay.lifeorganizer`
- versionCode 6 / versionName 3.7.1
- Debug GitHub build uses the release signing secrets so it can update the canonical installed app.
- Accounts, bills, goals, credits, BOM items, thesis roadmap items, routine groups/items, workouts/exercises, tasks and inventory have appropriate delete/remove controls.
- Rent, Wi-Fi, electricity and water migrate to monthly recurring bills; bill editor supports one-time/monthly/yearly repeat.
- Reset Data creates a fresh starting state, including Thesis/BOM, and clears old scheduled native reminders where possible.
- Positive XP gains show an in-app XP toast.
- Running Late: shift, keep, and manual-time options now have real behavior.
- Savings UI is hierarchical: allowance -> spendable + savings -> emergency + leisure/gala.
- Savings is capped to 100%; emergency + leisure/gala always equals 100% of savings.
- Goals can be edited and deleted.
- Native browser alert/confirm/prompt UI removed from app flows; matching in-app confirmations/toasts are used.
- Focus timer supports custom minutes plus highlighted presets, pause/resume/stop/reset and moving ring progress.
- Workout session supports pause/resume/stop with in-app leave warnings.
- Full Schedule alignment and Profile & Settings sticky/floating-header issue adjusted.
- Quick action and category icons adjusted: dumbbell, larger timer, near-horizontal pencil, larger Life tab, backpack belongings, health cross, apple food, shirt clothes.
- BOM category and unit use controlled dropdowns.
- Mind Map live nodes link to their actual app sections.
- Current Money is explicitly defined as the sum of account/wallet balances.
