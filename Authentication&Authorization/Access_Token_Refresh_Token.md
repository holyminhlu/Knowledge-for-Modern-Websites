# Access Token & Refresh Token trong lập trình web (tất tần tật, thực chiến)

## 1) Vì sao cần Access Token và Refresh Token?

Trong web hiện đại, bạn muốn:

- API xác thực nhanh, stateless, scale tốt
- Người dùng không phải đăng nhập lại liên tục
- Nếu token bị lộ, thiệt hại được giới hạn

Giải pháp phổ biến:

- **Access token**: sống **ngắn**, dùng gọi API
- **Refresh token**: sống **dài hơn**, dùng để xin access token mới

> Refresh token là “credential mạnh” (gần như password). Phải bảo vệ kỹ hơn access token.

## 2) Định nghĩa và vai trò

### 2.1 Access Token

- Dùng để truy cập tài nguyên (API).
- Mang thông tin quyền (scope/role/claims) hoặc là “opaque token” để API introspect.
- Thời hạn: thường 5–15 phút (tuỳ rủi ro/UX), đôi khi tới 60 phút.

### 2.2 Refresh Token

- Dùng để lấy access token mới mà không cần user nhập lại mật khẩu.
- Thường chỉ gửi đến **authorization server** (endpoint refresh).
- Thời hạn: vài ngày → vài tuần (tuỳ chính sách).

## 3) JWT vs Opaque token (liên quan trực tiếp)

Access token có thể là:

- **JWT**: API verify signature + validate claims (stateless)
- **Opaque**: API gọi introspection hoặc lookup session server-side

Refresh token thường là:

- **Opaque** (khuyến nghị) lưu trong DB để revoke/rotate dễ
- Hoặc JWT (ít khuyến nghị hơn nếu bạn cần revoke linh hoạt)

## 4) Lifetime (thời hạn) – chọn như thế nào?

Không có con số “chuẩn” cho mọi hệ, nhưng nguyên tắc:

- Access token càng **ngắn** → giảm thiệt hại khi bị lộ
- Refresh token càng **dài** → UX tốt nhưng rủi ro cao hơn

Thực dụng:

- Access token: 5–15 phút
- Refresh token: 7–30 ngày (tuỳ app), có idle timeout

Một số chính sách hữu ích:

- **Absolute expiry**: refresh token hết hạn sau N ngày dù có dùng
- **Idle expiry**: nếu không dùng trong N ngày thì hết hạn

## 5) Refresh Flow cơ bản

### 5.1 Flow tổng quát

1. User login → nhận access token + refresh token
2. Client gọi API bằng access token
3. Access token hết hạn → client gọi endpoint refresh
4. Server verify refresh token → cấp access token mới (và refresh token mới nếu rotate)

### 5.2 Khi nào refresh?

- Chủ động: refresh trước khi hết hạn (ví dụ còn 1 phút)
- Bị động: khi API trả 401/`token_expired` thì refresh rồi retry request

Khuyến nghị:

- Dùng “bị động + giới hạn retry” để tránh refresh quá sớm gây tăng tải.

## 6) Lưu trữ token an toàn theo loại ứng dụng

### 6.1 SPA (Single Page App) trên browser

Rủi ro chính:

- XSS có thể lấy token trong JS-accessible storage.
- Cookie auth có thể dính CSRF.

Pattern phổ biến (thực dụng):

- Access token: giữ **in-memory** (không persist) hoặc storage ngắn hạn (cân nhắc)
- Refresh token: **HttpOnly Secure cookie** (SameSite phù hợp)
- Refresh endpoint: dùng cookie để refresh

CSRF defenses khi dùng cookie:

- `SameSite=Lax` hoặc `Strict` nếu phù hợp
- CSRF token (double-submit hoặc synchronizer token)
- Check `Origin/Referer` cho refresh endpoint

### 6.2 Web SSR (server-rendered)

- Thường dùng session cookie server-side.
- Nếu dùng token:
  - giữ refresh token ở server (không đưa xuống browser), browser chỉ giữ session cookie.

### 6.3 Mobile (iOS/Android)

- Lưu refresh token trong secure storage (Keychain/Keystore).
- Access token có thể lưu memory hoặc secure storage tuỳ nhu cầu offline.
- Cẩn thận với backup/restore và root/jailbreak threat model.

### 6.4 Machine-to-machine

- Không dùng refresh token kiểu user.
- Dùng OAuth2 Client Credentials + short-lived access token.

## 7) Rotation (xoay refresh token) và reuse detection

### 7.1 Vì sao cần rotation?

Nếu refresh token bị đánh cắp, attacker có thể xin access token mới mãi cho đến khi refresh token hết hạn.

**Rotation** giảm thiệt hại:

- Mỗi lần refresh, server trả **refresh token mới** và **thu hồi** refresh token cũ.

### 7.2 Reuse detection

Nếu một refresh token đã bị rotate mà vẫn xuất hiện lại, có thể token bị lộ.

Chính sách phổ biến:

- Phát hiện reuse → revoke toàn bộ session / family tokens của user (hoặc của device)
- Bắt login lại + thông báo bảo mật

### 7.3 Token “family”

- Mỗi session/device có một “family id”.
- Rotation tạo chuỗi token trong cùng family.
- Reuse ở bất kỳ token nào → revoke toàn family.

## 8) Multi-device sessions (đăng nhập nhiều thiết bị)

Bạn nên mô hình hoá refresh token theo “session” hoặc “device”:

- Mỗi device có refresh token riêng
- User có thể revoke từng device (logout 1 thiết bị)

DB schema gợi ý (khái quát):

- `sessionId`, `userId`, `deviceId`, `createdAt`, `lastUsedAt`, `expiresAt`, `revokedAt`
- `refreshTokenHash` (không lưu plain)

## 9) Logout và revocation

### 9.1 Logout “local” (client-side)

- Xoá access token khỏi memory/storage.
- Không đủ nếu refresh token còn hợp lệ.

### 9.2 Logout “server-side” (revocation)

- Revoke refresh token/session trong DB.
- Khi refresh tiếp theo xảy ra → từ chối.

### 9.3 Thu hồi access token

Vì access token thường ngắn hạn, nhiều hệ chọn:

- Không revoke access token (chờ hết hạn)

Nếu cần revoke ngay (high-security):

- dùng opaque token + introspection
- hoặc JWT blacklist theo `jti` (tốn state)
- hoặc key rotation (thu hồi hàng loạt)

## 10) Security: các rủi ro và cách phòng

### 10.1 XSS

- Nếu refresh token trong localStorage → XSS = mất tài khoản.
- Khuyến nghị:
  - refresh token trong HttpOnly cookie (web)
  - CSP + sanitize + tránh inline script

### 10.2 CSRF (khi dùng cookie refresh)

- Refresh endpoint phải chống CSRF.
- Áp dụng SameSite + CSRF token + Origin checks.

### 10.3 Token theft từ log/URL

- Không đặt token trong query string.
- Không log Authorization header hoặc body chứa token.

### 10.4 Replay / credential stuffing

- Rate limit endpoint login/refresh.
- Device binding (tuỳ mức) + anomaly detection.

### 10.5 Over-privileged tokens

- Access token nên tối thiểu (scopes).
- Step-up/MFA cho hành động nhạy cảm thay vì “scope khổng lồ”.

## 11) Thiết kế endpoint refresh

Các best practices:

- Refresh token chỉ gửi tới **auth server**.
- Refresh endpoint nên:
  - rate limit
  - audit logging
  - trả lỗi rõ ràng (invalid/expired/revoked)
- Với SPA cookie-based refresh:
  - cân nhắc `POST /auth/refresh` (không dùng GET)

## 12) Concurrency: nhiều request cùng lúc khi token hết hạn

Tình huống hay gặp:

- UI bắn 5 request đồng thời, token vừa hết hạn
- Cả 5 request đều nhận 401 và cùng refresh → race condition

Giải pháp:

- Client implement “single-flight refresh”:
  - chỉ cho 1 refresh chạy
  - request khác đợi refresh xong rồi retry

## 13) OAuth2/OIDC context (tổng hợp)

- Trong OAuth2, refresh token thường chỉ được cấp trong một số flow và có chính sách riêng.
- Với SPA, tiêu chuẩn hiện đại thường khuyến nghị **Authorization Code + PKCE**.

Ghi nhớ:

- OIDC có `id_token` (identity) và `access_token` (authorization). Đừng dùng `id_token` để gọi API.

## 14) Observability và audit

Theo dõi:

- refresh rate theo user/app version
- refresh failures (revoked/expired/invalid)
- reuse detection events
- bất thường theo geo/ip/device

Audit log:

- login
- refresh
- revoke/logout
- change password (thường revoke toàn bộ session)

## 15) Anti-patterns (lỗi hay gặp)

- Access token sống quá lâu (1 ngày/1 tuần) cho browser
- Lưu refresh token trong localStorage
- Không rotation, không reuse detection
- Refresh endpoint không chống CSRF (khi dùng cookie)
- Không rate limit login/refresh
- Không hỗ trợ revoke theo device/session
- Dùng id_token thay access token để gọi API

## 16) Checklist production (tóm tắt)

- Access token short-lived, scopes tối thiểu
- Refresh token được bảo vệ mạnh (cookie HttpOnly hoặc secure storage)
- Refresh token rotation + reuse detection
- Revocation theo session/device + audit log
- CSRF defense nếu refresh dùng cookie
- Client single-flight refresh + retry policy an toàn
- Monitoring refresh anomalies

---

Nếu bạn muốn, mình có thể bổ sung thêm một mục “Flow mẫu cho SPA” (login + refresh cookie + retry interceptor) và một mục “Flow mẫu cho mobile” (secure storage + rotate + revoke).
