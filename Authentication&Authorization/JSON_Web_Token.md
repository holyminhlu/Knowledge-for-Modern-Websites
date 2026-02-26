# JSON Web Token (JWT) trong lập trình web (tất tần tật, thực chiến)

## 1) JWT là gì?

**JWT (JSON Web Token)** là một chuẩn (RFC 7519) để biểu diễn một “token” dạng chuỗi, chứa các **claims** (thông tin/khẳng định) được **ký số (signed)** để bên nhận có thể kiểm tra tính toàn vẹn và tính xác thực.

JWT rất hay dùng để:

- **Access token** trong OAuth2/OpenID Connect
- Session “stateless” (không lưu session server-side) cho API
- Trao đổi identity giữa các service (service-to-service)

Điểm cực quan trọng:

- JWT **thường là ký (JWS)**, **không phải mã hoá**.
- Nội dung JWT có thể **đọc được** (base64url). Đừng nhét bí mật/PII nhạy cảm vào JWT nếu không mã hoá.

## 2) JWT hoạt động như thế nào?

### 2.1 Cấu trúc JWT

JWT có dạng:

`header.payload.signature`

- **Header**: thuật toán ký (`alg`), type (`typ`)
- **Payload**: claims (thông tin)
- **Signature**: chữ ký để verify

Ví dụ (dạng JSON, minh hoạ):

Header:

```json
{ "alg": "RS256", "typ": "JWT", "kid": "key-1" }
```

Payload:

```json
{
  "sub": "user_123",
  "iss": "https://auth.example.com",
  "aud": "api://my-service",
  "exp": 1700000000,
  "iat": 1699996400,
  "scope": "read:orders write:orders"
}
```

### 2.2 Ký và verify

- Server/IdP ký JWT bằng secret/private key.
- API verify chữ ký bằng secret/public key.

JWT giúp API tin rằng:

- Token do “issuer” hợp lệ phát hành
- Payload không bị sửa

Nhưng JWT **không tự động** đảm bảo:

- Token chưa bị đánh cắp
- Token còn hợp lệ về mặt business (user bị ban, quyền bị đổi…)

## 3) JWT không phải là gì?

- JWT **không phải encryption** (mặc định ai cũng đọc được payload).
- JWT **không thay thế** hoàn toàn session truyền thống trong mọi trường hợp.
- JWT **không tự giải quyết** revoke/đăng xuất ngay lập tức.

## 4) Thuật toán ký: HS256 vs RS256/ES256

### 4.1 HS256 (HMAC – symmetric key)

- Producer và verifier dùng **cùng một secret**.
- Dễ triển khai.
- Rủi ro:
  - Nếu nhiều service cùng verify, secret phải chia sẻ rộng → tăng blast radius.
  - Lộ secret = giả mạo token.

### 4.2 RS256 (RSA – asymmetric)

- Ký bằng **private key**, verify bằng **public key**.
- Phù hợp kiến trúc microservices: chỉ IdP giữ private key.

### 4.3 ES256 (ECDSA – asymmetric)

- Tương tự RS256 nhưng key nhỏ hơn, nhanh hơn trong nhiều trường hợp.
- Triển khai cần thư viện hỗ trợ tốt và quản lý key đúng.

Khuyến nghị thực dụng:

- Hệ nhiều service: ưu tiên **RS256/ES256**.
- Hệ đơn giản (monolith) có thể HS256, nhưng quản lý secret phải chặt.

## 5) Các claims chuẩn và claims tuỳ biến

### 5.1 Registered claims (hay dùng)

- `iss` (issuer): ai phát hành
- `sub` (subject): định danh user/principal
- `aud` (audience): token dành cho ai (API nào)
- `exp` (expiry): hết hạn
- `nbf` (not before): chưa có hiệu lực trước thời điểm này
- `iat` (issued at)
- `jti` (JWT ID): định danh token (hữu ích cho revoke/trace)

### 5.2 Custom claims

- Có thể thêm `orgId`, `roles`, `permissions`, `tenant`, `mfa`…

Nhưng cần cân nhắc:

- Token phình to → tăng băng thông
- Claim đổi thường xuyên → token nhanh stale
- Claim nhạy cảm → không nên để trong JWT (trừ khi JWE)

## 6) Validate JWT đúng cách (checklist bắt buộc)

Khi API nhận JWT, tối thiểu cần:

- Verify chữ ký
- Check `exp` (và chấp nhận clock skew nhỏ)
- Check `iss`
- Check `aud` (đúng audience của service)
- Check `nbf`/`iat` (nếu dùng)
- Check `alg` hợp lệ (đừng chấp nhận tuỳ tiện)
- Nếu dùng `kid`, phải lấy đúng public key tương ứng (JWKS)

Sai lầm phổ biến:

- Không check `aud` → token của app khác dùng được
- Chấp nhận `alg=none` hoặc “algorithm confusion” do config sai

## 7) JWT và Session: nên dùng khi nào?

### 7.1 JWT phù hợp khi

- API stateless, nhiều instance
- Microservices cần verify token độc lập
- Bạn dùng OAuth2/OIDC chuẩn

### 7.2 Session cookie (server-side session) phù hợp khi

- Web app truyền thống SSR
- Cần revoke tức thì, quản trị session mạnh
- Bạn muốn giảm rủi ro token bị lộ dài hạn

Thực tế: nhiều hệ dùng **cookie session** cho web + **JWT** cho API/m2m.

## 8) Lưu trữ JWT ở client: cookie vs localStorage (SPA/web)

### 8.1 LocalStorage / sessionStorage

- Ưu: đơn giản.
- Nhược: dễ bị lấy nếu bị **XSS**.

### 8.2 HttpOnly Secure Cookie

- Ưu: chống đọc bằng JS (giảm rủi ro XSS lấy token).
- Nhược: cần chống **CSRF** (SameSite, CSRF token, origin checks).

Khuyến nghị thực dụng cho SPA:

- Access token ngắn hạn.
- Refresh token để trong **HttpOnly cookie** (hoặc storage an toàn trên mobile).
- API có thể dùng cookie hoặc bearer tuỳ kiến trúc; nếu dùng cookie cần CSRF defenses.

## 9) Access token vs Refresh token (liên quan chặt với JWT)

- **Access token**: sống ngắn (vài phút đến ~1h), dùng gọi API.
- **Refresh token**: sống dài hơn (ngày/tuần), dùng để lấy access token mới.

Best practices:

- Access token **ngắn hạn** để giảm thiệt hại khi bị lộ.
- Refresh token nên có:
  - **rotation** (mỗi lần refresh cấp refresh token mới)
  - phát hiện reuse (reuse detection)
  - lưu server-side (opaque) hoặc dạng JWT nhưng quản lý chặt

## 10) Revocation và logout (điểm yếu kinh điển của JWT)

JWT stateless → khó “thu hồi ngay” nếu chỉ dựa vào `exp`.

Các cách xử lý:

- **Short-lived access token** + refresh token rotation (phổ biến nhất)
- **Blacklist/denylist** theo `jti` (tốn state, cần cache phân tán)
- **Key rotation** (thu hồi hàng loạt): đổi key → token cũ không verify được
- “Session-based” cho web nhạy cảm: dùng session ID thay JWT

Không có giải pháp duy nhất đúng; chọn theo risk/UX.

## 11) JWT trong microservices

Mô hình thường gặp:

- Một Identity Provider (Auth service) phát JWT
- Các service verify bằng public key (JWKS)

Lưu ý:

- Không nên “tự mint JWT” ở mọi service.
- Nếu cần “service identity”, dùng client credentials flow (OAuth2) hoặc mTLS.

## 12) JWT và OAuth2/OIDC (đừng nhầm lẫn)

- **OAuth2** là framework cấp quyền (authorization), không định nghĩa token phải là JWT.
- **OIDC** thêm lớp identity (id_token thường là JWT).
- Nhiều hệ dùng JWT làm access token, nhưng access token có thể là opaque.

Nếu bạn dùng OAuth2/OIDC, hãy tuân theo khuyến nghị của provider (Auth0/Keycloak/Cognito…).

## 13) Bảo mật: các rủi ro và cách phòng

### 13.1 XSS

- Nếu access token nằm trong JS-accessible storage → XSS có thể lấy.
- Phòng:
  - CSP nghiêm
  - sanitize
  - tránh inline script
  - cân nhắc cookie HttpOnly cho refresh token

### 13.2 CSRF (khi dùng cookie)

- Nếu bạn dùng cookie để auth, request cross-site có thể kèm cookie.
- Phòng:
  - `SameSite=Lax/Strict` (tuỳ UX)
  - CSRF token
  - kiểm tra `Origin/Referer`

### 13.3 Token leakage qua URL/log

- Tránh truyền JWT qua query string.
- Không log Authorization header.

### 13.4 Audience/issuer misconfiguration

- Luôn verify `iss`/`aud`.
- Mỗi service có audience riêng.

### 13.5 Key management

- Bảo vệ private key (HSM/KMS nếu cần).
- Rotate keys định kỳ.
- Dùng `kid` + JWKS để phân phối public keys.

## 14) Thiết kế claims “đủ dùng” (không nhồi quá)

Nguyên tắc:

- JWT nên là “chứng minh identity + vài quyền coarse-grained” (role/scope).
- Fine-grained authorization (ABAC) nên dựa trên DB/PDP ở server.

Ví dụ:

- Đưa `orgId` vào token để chặn cross-tenant nhanh.
- Không đưa cả danh sách permissions động dài vào token nếu thay đổi thường xuyên.

## 15) Observability và audit

- Log `sub`, `iss`, `aud`, `jti` (nếu có) và `requestId/traceId`.
- Tránh log toàn bộ token.
- Theo dõi:
  - tỉ lệ 401/403
  - token expired rate
  - refresh rate (bất thường có thể là token theft)

## 16) Anti-patterns (lỗi hay gặp)

- Nhầm “JWT = encryption”, nhét dữ liệu nhạy cảm vào payload
- Access token sống quá lâu (1 ngày/1 tuần) cho SPA
- Không check `aud`/`iss`
- Dùng HS256 trong microservices rồi share secret khắp nơi
- Logout nhưng không có revoke strategy (user vẫn dùng token cũ đến hết hạn)
- Truyền token qua query string hoặc lưu ở localStorage mà không có CSP

## 17) Checklist production (tóm tắt)

- Chọn thuật toán phù hợp (ưu tiên asymmetric cho nhiều service)
- Validate đầy đủ: signature + exp + iss + aud + alg
- Access token ngắn hạn + refresh token rotation
- Lưu trữ token an toàn (HttpOnly cookie cho refresh, chống CSRF/XSS)
- Key rotation + JWKS + quản lý `kid`
- Logging/audit đúng (không log token)

---

Nếu bạn muốn, mình có thể viết thêm một mục “JWT cho SPA vs Mobile vs Server-rendered” (3 chiến lược lưu trữ/refresh khác nhau) để bạn chọn nhanh theo loại ứng dụng.
