# MFA (Multi-Factor Authentication) trong lập trình web (tất tần tật)

## 1) MFA là gì và giải quyết vấn đề gì?

**MFA (xác thực đa yếu tố)** là cơ chế yêu cầu người dùng cung cấp **từ 2 yếu tố trở lên** khi đăng nhập hoặc thực hiện hành động nhạy cảm.

Mục tiêu: giảm rủi ro khi **mật khẩu bị lộ** (phishing, reuse, malware, data breach…).

> MFA không “chống hack 100%”, nhưng giảm mạnh tỷ lệ account takeover nếu triển khai đúng.

## 2) Các loại “yếu tố” (factors)

Phân loại kinh điển:

1. **Knowledge** – thứ bạn biết: password, PIN
2. **Possession** – thứ bạn có: điện thoại, security key
3. **Inherence** – thứ bạn là: vân tay, khuôn mặt

MFA đúng nghĩa: ít nhất **2 loại** khác nhau.

Ví dụ:

- Password (knowledge) + TOTP trên app (possession)
- Password + WebAuthn security key (possession)

Không phải MFA (thường bị hiểu nhầm):

- 2 lần nhập password (vẫn 1 factor)
- OTP qua email nếu email dùng chung password/không bảo vệ (vẫn tăng bảo mật nhưng yếu)

## 3) Các phương án MFA phổ biến trong web

### 3.1 TOTP (Time-based One-Time Password)

- Mã 6–8 số đổi theo thời gian (mỗi 30s), tạo từ **shared secret**.
- Người dùng dùng app như Google Authenticator, Microsoft Authenticator, 1Password.

Ưu:

- Offline, không phụ thuộc SMS.
- Phổ biến, dễ tích hợp.

Nhược:

- Bị **phishing** nếu user nhập OTP vào trang giả.
- Cần quy trình recovery nếu mất điện thoại.

### 3.2 WebAuthn / FIDO2 (Security Key, Passkeys)

- Dùng public-key cryptography.
- Có thể là hardware key (YubiKey) hoặc passkey (biometric trên thiết bị).

Ưu:

- **Chống phishing mạnh** (ràng buộc theo origin).
- Trải nghiệm tốt với passkeys.

Nhược:

- Tích hợp phức tạp hơn.
- Cần fallback/recovery cho thiết bị không hỗ trợ.

### 3.3 Push-based MFA (approve/deny)

- App trên điện thoại nhận push, user bấm approve.

Ưu:

- UX tốt.

Nhược:

- Dễ bị “push fatigue” (spam approve).
- Cần ràng buộc ngữ cảnh (number matching, device binding).

### 3.4 SMS OTP

- OTP gửi qua SMS.

Ưu:

- Phổ biến, dễ hiểu.

Nhược (quan trọng):

- Dễ bị **SIM swap**, SS7 attack, intercept.
- Không khuyến nghị cho high-security.

### 3.5 Email OTP / Magic link

- Gửi code hoặc link qua email.

Ưu:

- Dễ triển khai.

Nhược:

- Độ an toàn phụ thuộc bảo mật email.
- Không chống phishing tốt.

### 3.6 Backup codes / Recovery codes

- Một bộ mã dùng một lần để “cứu” khi mất thiết bị MFA.

Vai trò:

- Không phải factor chính, nhưng là cơ chế khôi phục bắt buộc phải có.

## 4) MFA dùng ở đâu trong hành trình người dùng?

### 4.1 MFA khi đăng nhập

Flow cơ bản:

1. User nhập username/password
2. Password đúng → yêu cầu factor 2
3. Factor 2 đúng → cấp session/tokens

### 4.2 Step-up authentication (xác thực tăng cường)

Không phải lúc nào cũng cần MFA. Bạn có thể yêu cầu MFA khi user làm hành động nhạy cảm:

- đổi email/đổi mật khẩu
- rút tiền/chuyển tiền
- export dữ liệu
- xoá project, đổi quyền admin

### 4.3 Risk-based / Adaptive MFA

Trigger MFA dựa trên rủi ro:

- đăng nhập từ thiết bị mới
- IP/geo bất thường
- nhiều lần sai password
- user có quyền admin

Đây là cách cân bằng giữa bảo mật và UX.

## 5) Enrollment (bật MFA) – thiết kế đúng để an toàn

Enrollment thường bị tấn công (attacker đã login bằng password bị lộ và muốn gắn MFA của họ).

Khuyến nghị:

- Khi user bật MFA, yêu cầu **re-auth** (nhập lại password) hoặc step-up.
- Thông báo qua email/notification: “MFA vừa được bật”.
- Có “cooldown” hoặc workflow xác nhận cho thay đổi nhạy cảm.

### 5.1 Enrollment TOTP (flow)

1. Server tạo `totpSecret`
2. Hiển thị QR (otpauth://)
3. User scan bằng authenticator
4. User nhập code để verify
5. Server lưu secret (mã hoá) và đánh dấu MFA enabled

Chú ý:

- Chỉ chấp nhận code trong cửa sổ thời gian cho phép (skew) nhỏ.
- Rate limit attempts.

### 5.2 Enrollment WebAuthn (flow tóm tắt)

1. Server tạo challenge + options
2. Browser gọi WebAuthn API tạo credential
3. Server verify attestation/response
4. Lưu public key + credentialId + signCount…

## 6) Challenge/Verification – chống brute force và replay

Các quy tắc tối thiểu:

- Rate limit theo user + IP + device
- Lockout tạm thời khi sai liên tục (cẩn thận DoS account lockout)
- Với OTP: giới hạn số lần thử/phiên
- Log audit mọi lần thất bại

OTP replay:

- TOTP có thể trùng trong cùng window; thường chấp nhận nếu code hợp lệ.
- Với recovery code: phải **one-time use** (mark used).

## 7) “Remember this device” và thiết bị tin cậy

Để giảm phiền, hệ thường cho phép “tin cậy thiết bị 30 ngày”.

Thiết kế đúng:

- Lưu **device binding token** (cookie HttpOnly) hoặc record device trong DB.
- Token phải:
  - random, không đoán được
  - có expiry
  - có thể revoke

Lưu ý bảo mật:

- Đừng tin cậy vĩnh viễn.
- Nếu phát hiện risk (IP lạ), vẫn yêu cầu MFA.

## 8) Recovery (khôi phục tài khoản) – phần quan trọng nhất sau enrollment

Nếu user mất máy/đổi điện thoại, bạn cần con đường khôi phục.

Các phương án:

- **Recovery codes** (khuyến nghị, phát 1 lần khi bật MFA)
- “Secondary factor” dự phòng (ví dụ thêm 2nd TOTP, thêm security key)
- Support manual: KYC/verify identity (tốn kém, cần quy trình)

Nguyên tắc:

- Recovery là nơi attacker nhắm tới → yêu cầu step-up, delay, notify.
- Mọi thay đổi MFA phải audit và notify.

## 9) MFA và Tokens/Sessions (JWT, refresh token)

### 9.1 “MFA state” nên thể hiện thế nào?

Bạn thường cần phân biệt:

- User đã đăng nhập nhưng **chưa pass MFA** (MFA pending)
- User đã pass MFA (MFA satisfied)

Gợi ý:

- Có session state server-side hoặc claim trong token như `amr` (authentication methods reference) / `acr` (assurance level).
- Access token có thể thể hiện level: ví dụ `acr=urn:mfa`.

### 9.2 Step-up và token mới

Khi user hoàn thành step-up MFA, nên cấp token/session mới với level cao hơn.

### 9.3 Refresh token rotation

- Refresh token nên rotate.
- Nếu phát hiện refresh token reuse → revoke toàn bộ session và yêu cầu đăng nhập lại.

## 10) Threat model: MFA bị vượt qua bằng cách nào?

### 10.1 Phishing

- TOTP/SMS/email OTP có thể bị “real-time phishing” (attacker nhập lại ngay).
- Mitigation:
  - ưu tiên WebAuthn/passkeys
  - number matching / transaction signing cho push
  - device binding + risk checks

### 10.2 SIM swap (SMS)

- Attacker chiếm SIM → nhận OTP.
- Mitigation:
  - hạn chế SMS cho high-risk
  - phát hiện thay đổi SIM/phone, tăng step-up

### 10.3 Push fatigue

- Spam push đến khi user bấm approve.
- Mitigation:
  - number matching
  - hiển thị thông tin đăng nhập (IP/geo/device)
  - rate limit, lock flows

### 10.4 Session hijacking

- MFA không giúp nếu attacker đã lấy được session cookie/token sau login.
- Mitigation:
  - bảo vệ khỏi XSS
  - secure cookie (HttpOnly, Secure, SameSite)
  - token rotation
  - device binding

## 11) Bảo mật lưu trữ secrets/keys

### 11.1 TOTP secret

- Lưu server-side.
- Mã hoá at-rest (KMS nếu có).
- Không log secret.

### 11.2 WebAuthn credentials

- Lưu public key + metadata.
- Không lưu “private key” (nằm trên authenticator).

### 11.3 Recovery codes

- Lưu dạng hash (như password) + salt.
- Khi user dùng, mark used.

## 12) UX và accessibility

- Giải thích rõ MFA là gì, vì sao cần.
- Hướng dẫn scan QR/TOTP.
- Có fallback hợp lý (ít nhất recovery codes).
- Tránh khoá user vĩnh viễn.

## 13) Observability và audit

Metrics nên có:

- tỉ lệ login yêu cầu MFA
- tỉ lệ pass/fail MFA
- số lần lockout
- số lần recovery

Audit logs:

- bật/tắt MFA
- thêm/xoá factor
- dùng recovery code
- step-up events

## 14) Anti-patterns (lỗi hay gặp)

- Chỉ hỗ trợ SMS OTP cho admin/high-privileged accounts
- Cho phép bật MFA mà không re-auth
- Không có recovery codes → support overload, user mất account
- Không rate limit OTP → brute force
- “Remember device” vĩnh viễn hoặc token không thể revoke
- Không notify khi MFA settings thay đổi
- Không phân biệt token đã pass MFA vs chưa (step-up vô tác dụng)

## 15) Checklist production (tóm tắt)

- Chọn factor ưu tiên: WebAuthn/passkeys (phishing-resistant) + TOTP fallback
- Enrollment an toàn: re-auth + notify + audit
- Verification: rate limit, lockout an toàn, logging
- Recovery: recovery codes + quy trình hỗ trợ
- Step-up cho hành động nhạy cảm
- Token/session: thể hiện assurance level (`acr/amr`) + rotation
- Monitor & alert: bất thường MFA failures, push spam, recovery spikes

---

Nếu bạn muốn, mình có thể bổ sung thêm một mục so sánh “MFA cho SPA vs Mobile vs SSR” (khác nhau ở storage/session/CSRF) và một flow mẫu end-to-end (login → mfa pending → verify → issue tokens).
