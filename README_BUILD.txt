EDJAY'S LIFE ORGANIZER — ANDROID V3.7.6

VERSION
- applicationId: com.edjay.lifeorganizer
- versionName: 3.7.6
- versionCode: 11

THIS PATCH
- Import Backup text is vertically centered.
- Quick Action Note and Life Notes use a compact outline pencil icon sized to match nearby icons.
- Money Snapshot values are tappable and open the related Money section.
- Current Money = sum of account/wallet balances.
- Net Worth = Current Money - outstanding credit/payables including fees.
- Available After Listed Bills = Net Worth - one listed budget amount for each current bill.
- Savings is an earmark inside Current Money and is not added again to Net Worth.
- Income Sources are functional: tap to record income; add/edit/delete saved sources.
- Money overview cards link to Accounts, Net Worth, Allowance/Savings, Credit, and Bills.

SIGNING / UPDATE IDENTITY
Both GitHub debug/test and release workflows use the same applicationId and require the permanent signing key in GitHub Actions secrets. Keep using the same keystore forever so future APKs install as updates.

Required GitHub secrets:
- ANDROID_KEYSTORE_BASE64
- ANDROID_STORE_PASSWORD
- ANDROID_KEY_ALIAS
- ANDROID_KEY_PASSWORD

DEBUG BUILD
Actions > Build Debug APK. The workflow refuses to build without the permanent signing secrets.

SIGNED RELEASE
Actions > Build Signed Release APK. Release builds use the same permanent signing key.

IMPORTANT
Never commit the .jks file, keystore Base64 text, or signing passwords to the repository.
