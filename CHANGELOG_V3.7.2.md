# Edjay's Life Organizer V3.7.2

Corrective Android UI/update patch on top of V3.7.1.

- Compact Thesis Roadmap status + overflow menu instead of full-width Edit buttons.
- Fixed Android spacing/alignment for Thesis, Life tiles, Quick Actions, bottom navigation, and Full Schedule.
- Added prominent +XP feedback animation and XP revert feedback.
- Thesis schedule sessions award the Important-task value (+40 XP); Workout keeps workout XP.
- Kept package ID `com.edjay.lifeorganizer`.
- Version bumped to 3.7.2 / versionCode 7.
- Debug/test workflow now refuses to build without the permanent signing secrets, preventing accidental package-signature drift.
- Test/debug and release builds use the same permanent signing key when built in GitHub Actions.
