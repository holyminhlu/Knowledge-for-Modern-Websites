# OAuth 2.0 trong lập trình web (tất tần tật, thực chiến)

## 1) OAuth 2.0 là gì?

**OAuth 2.0** là một framework tiêu chuẩn (RFC 6749 và các RFC liên quan) để **cấp quyền truy cập (authorization)** cho một client vào tài nguyên (API/resource server) thay mặt cho người dùng hoặc chính client.

Điểm quan trọng:

- OAuth2 chủ yếu giải quyết **authorization (ủy quyền/cấp quyền)**.
- OAuth2 **không tự định nghĩa authentication (đăng nhập/định danh)**.
  - Nếu bạn cần “đăng nhập bằng Google” đúng nghĩa identity, bạn thường dùng **OpenID Connect (OIDC)** trên nền OAuth2.

Ví dụ dùng OAuth2:

- Ứng dụng A xin quyền đọc Gmail của user (thay vì xin mật khẩu Gmail)
- Mobile app xin quyền gọi API backend
- Service-to-service dùng client credentials

## 2) Các vai trò (roles) trong OAuth2

OAuth2 có 4 vai trò:

- **Resource Owner**: chủ tài nguyên (thường là user)
- **Client**: ứng dụng muốn truy cập tài nguyên (SPA/mobile/backend/service)
- **Authorization Server (AS)**: server phát hành token (Auth0/Keycloak/Cognito…)
- **Resource Server (RS)**: API/Service nhận token và bảo vệ tài nguyên

Các khái niệm cốt lõi:

- **Authorization Grant**: “bằng chứng” client dùng để xin access token
- **Access Token**: token để gọi RS
- **Refresh Token**: token để xin access token mới (không phải flow nào cũng có)
- **Scope**: phạm vi quyền

## 3) Access Token là gì? JWT vs opaque

Access token có thể là:

- **JWT (self-contained token)**: RS tự verify chữ ký và claims (`iss/aud/exp/...`).
- **Opaque token**: RS phải gọi **introspection** hoặc lookup session.

Chọn kiểu nào?

- JWT: scale tốt, ít phụ thuộc mạng, nhưng revoke tức thì khó hơn.
- Opaque: revoke dễ hơn, nhưng cần introspection/lookup (thêm latency, cần cache).

## 4) Các flow/grant type phổ biến (và khi nào dùng)

OAuth2 có nhiều grant type. Trong web hiện đại, 3 flow phổ biến nhất:

### 4.1 Authorization Code Grant (+ PKCE) – lựa chọn mặc định cho user login

Use case:

- SPA, Mobile, Web app (kể cả SSR), nơi user đăng nhập qua AS

Flow tóm tắt:

1. Client redirect user đến AS `/authorize` (kèm `client_id`, `redirect_uri`, `scope`, `state`, và PKCE)
2. User login/consent ở AS
3. AS redirect về `redirect_uri` kèm `code`
4. Client đổi `code` lấy token tại AS `/token`

**PKCE (Proof Key for Code Exchange)**:

- Thêm `code_verifier`/`code_challenge` để chống “authorization code interception”.
- Với SPA/mobile, **PKCE là bắt buộc** theo best practice hiện đại.

### 4.2 Client Credentials Grant – service-to-service

Use case:

- Backend service gọi backend service (không có user)

Flow:

- Client gửi `client_id` + `client_secret` (hoặc mTLS/private_key_jwt) đến `/token`
- Nhận access token để gọi RS

Lưu ý:

- Quyền thường thể hiện bằng scopes dành cho machine.
- Tuyệt đối không dùng client secret ở SPA/browser.

### 4.3 Device Authorization Grant (Device Code) – thiết bị nhập khó

Use case:

- TV app, CLI, IoT… nơi nhập password khó

Flow:

- Thiết bị lấy `device_code` + `user_code`
- User vào URL trên điện thoại/laptop để xác nhận
- Thiết bị polling `/token` để lấy access token

## 5) Các flow/grant type “cũ” nên tránh

### 5.1 Implicit Flow (không khuyến nghị)

- Trước đây dùng cho SPA, token trả thẳng qua redirect.
- Nay **không khuyến nghị** vì rủi ro leakage và thiếu cơ chế bảo vệ như PKCE.

### 5.2 Resource Owner Password Credentials (ROPC)

- Client thu password của user và gửi thẳng cho AS.
- **Không khuyến nghị** vì phá vỡ nguyên tắc OAuth (client không nên thấy password).

## 6) Redirect URI, state và các tham số bảo mật

### 6.1 Redirect URI

- Là điểm AS redirect về sau khi user login.
- Phải **whitelist chính xác**.
- Tránh wildcard/broad matching.

### 6.2 `state` (CSRF protection)

- `state` là giá trị random client tạo, gửi lên `/authorize`.
- Khi redirect về, client check state để chống:
  - CSRF
  - mix-up attacks (một số tình huống phức tạp)

### 6.3 PKCE

- Bắt buộc cho public clients (SPA/mobile).
- Không thay thế `state`; cần cả hai.

## 7) Scope và Consent

### 7.1 Scope

- Scope mô tả quyền: `read:orders`, `write:orders`, `openid`, `profile`…
- Nên thiết kế scope theo nghiệp vụ, tránh scope “\*”.

### 7.2 Consent

- Với third-party app, consent screen là bắt buộc.
- Với first-party app, có thể “skip consent” tuỳ policy, nhưng vẫn nên audit.

## 8) Refresh Token

Refresh token cho phép client xin access token mới.

Best practices:

- Access token short-lived
- Refresh token rotation + reuse detection
- Revoke theo session/device

Lưu ý cho SPA:

- Refresh token nên lưu trong **HttpOnly cookie** (cần chống CSRF) hoặc cơ chế an toàn tương đương.

## 9) Token validation ở Resource Server

Nếu access token là JWT, RS cần:

- verify signature
- check `exp`
- check `iss`
- check `aud` (đúng API)
- check `scope`/permissions
- check `alg` hợp lệ

Nếu access token là opaque:

- introspection (RFC 7662) + cache kết quả

## 10) JWKS, `kid`, và key rotation

- AS thường publish public keys qua endpoint **JWKS**.
- JWT header có `kid` để RS chọn đúng key.

Best practices:

- Cache JWKS (có TTL) và refresh khi gặp key mới.
- Rotate keys định kỳ.
- Bảo vệ private keys bằng KMS/HSM nếu cần.

## 11) Revocation, logout và session management

OAuth2 có endpoint **token revocation** (RFC 7009) để thu hồi refresh token/opaque token.

Với JWT access token:

- Thường không revoke từng token (đợi hết hạn) hoặc dùng denylist/introspection.

Logout:

- OAuth2 không định nghĩa “logout chuẩn” cho identity.
- Nếu dùng OIDC, có thêm khái niệm logout/session.

## 12) OAuth2 trong các kiểu ứng dụng web

### 12.1 SPA

- Dùng Authorization Code + PKCE.
- Không dùng client secret.
- Lưu refresh token an toàn (HttpOnly cookie) + CSRF defenses.

### 12.2 Web SSR (Backend-for-Frontend)

- Backend làm “confidential client” giữ secret.
- Browser giữ session cookie.
- Backend đổi code lấy token và lưu server-side.

Ưu:

- Token không lộ ra JS.

### 12.3 Mobile

- Authorization Code + PKCE.
- Dùng system browser (ASWebAuthenticationSession/Chrome Custom Tabs).
- Lưu refresh token trong Keychain/Keystore.

### 12.4 Microservices

- User token: RS verify JWT hoặc introspect.
- Service token: client credentials.
- Có thể dùng token exchange (tuỳ hệ) nếu cần.

## 13) Các extension hiện đại đáng biết (tuỳ mức độ cần)

> Không phải dự án nào cũng cần, nhưng hữu ích khi security cao.

- **PKCE** (đã nói)
- **PAR (Pushed Authorization Requests)**: gửi request params qua backchannel để giảm rủi ro tampering
- **JAR (JWT Secured Authorization Request)**: ký request authorize bằng JWT
- **DPoP**: chống token replay bằng proof-of-possession (giảm rủi ro token theft)
- **mTLS**: binding token với cert (high security)

## 14) Các lỗi bảo mật hay gặp (anti-patterns)

- Dùng Implicit flow cho SPA
- Không dùng PKCE / không validate `state`
- Redirect URI wildcard hoặc allow quá rộng
- Không check `aud`/`iss` ở RS
- Lưu access/refresh token trong localStorage mà không có CSP, XSS hygiene
- Log token hoặc đưa token vào URL
- Dùng ROPC vì “cho nhanh”

## 15) Observability và vận hành

Theo dõi:

- login success/failure
- token issuance rate
- refresh rate + refresh failures
- revoke events
- anomaly theo IP/geo/device

Log/Audit:

- `client_id`, `user_id`, `scope`, `grant_type`
- Không log token raw

## 16) Checklist production (tóm tắt)

- Chọn flow đúng:
  - User: Authorization Code + PKCE
  - Service: Client Credentials
  - Device: Device Code
- Bảo mật authorize:
  - validate `state`
  - whitelist redirect URI
  - dùng PKCE
- Token policy:
  - access token short-lived
  - refresh rotation + reuse detection
  - revoke theo device/session
- RS validate token đúng (iss/aud/exp/alg + scopes)
- Key rotation + JWKS cache
- Không log token, không truyền token qua URL

---

Nếu bạn muốn, mình có thể bổ sung một mục “OAuth2 vs OIDC” thật rõ ràng (id_token, nonce, session) và một flow mẫu end-to-end cho SPA (kèm CSRF-safe refresh cookie).
