---
title: SOLID Principle trong lập trình web
description: Handbook production-ready về SOLID (SRP/OCP/LSP/ISP/DIP) áp dụng cho web backend/frontend: định nghĩa, dấu hiệu vi phạm, ví dụ thực tế, cách refactor, và checklist.
---

# SOLID Principle trong lập trình web

## 0) SOLID là gì và vì sao quan trọng trong web?

**SOLID** là bộ 5 nguyên tắc thiết kế hướng đối tượng (OO) giúp code:

- dễ thay đổi khi yêu cầu sản phẩm đổi liên tục
- dễ test (đặc biệt unit test)
- ít bug do side-effects/coupling
- dễ mở rộng team (nhiều người cùng làm mà không “đạp nhau”)

Trong lập trình web, SOLID đặc biệt hữu ích vì:

- backend thường có nhiều integration (DB, cache, queue, payment, email)
- business rules thay đổi nhanh
- hệ thống phải vận hành production (observability, resilience)

Lưu ý: SOLID không phải “luật cứng”. Mục tiêu là **giảm rủi ro thay đổi** và **tăng khả năng hiểu/kiểm thử**, không phải tạo abstraction vô hạn.

---

## 1) S — Single Responsibility Principle (SRP)

### 1.1 Định nghĩa

> Một module/class/function chỉ nên có **một lý do để thay đổi**.

Trong web, “một trách nhiệm” thường tương ứng với:

- một use case (CreateOrder)
- một policy (PasswordPolicy)
- một adapter cho integration (SendGridEmailSender)

### 1.2 Dấu hiệu vi phạm SRP

- File/class rất dài, nhiều nhánh if/else theo loại nghiệp vụ.
- Một thay đổi nhỏ (ví dụ đổi format email) làm phải sửa nhiều chỗ.
- Unit test khó vì phải mock quá nhiều thứ.

Ví dụ thường gặp:

- Controller vừa validate, vừa xử lý nghiệp vụ, vừa query DB, vừa gọi external.
- “God service”: `UserService` làm login, reset password, billing profile, analytics...

### 1.3 Cách áp dụng SRP trong backend web

- Controller: chỉ parse/validate transport + gọi use case + map response.
- Use case/service: điều phối nghiệp vụ của một hành động.
- Repository: chỉ data access.
- Adapter: chỉ tích hợp hệ thống ngoài (email, payment, storage).

Ví dụ cấu trúc (khái niệm):

- `CreateOrderHandler` (HTTP)
- `CreateOrderUseCase`
- `OrderRepository` (interface)
- `PostgresOrderRepository` (implementation)
- `PaymentGateway` (interface)
- `StripePaymentGateway` (implementation)

### 1.4 Cách áp dụng SRP trong frontend

- Component UI chỉ chịu trách nhiệm render/interaction; không ôm cả data fetching phức tạp.
- Tách: UI component (presentational) vs container/hook (data + state).
- Tách logic tái sử dụng thành hooks/utilities.

### 1.5 Anti-pattern SRP

- “Tách cho đẹp” nhưng tạo quá nhiều lớp mỏng vô nghĩa.
- Tách trách nhiệm nhưng vẫn share state/global mutable khiến coupling ẩn.

---

## 2) O — Open/Closed Principle (OCP)

### 2.1 Định nghĩa

> Software entities nên **mở để mở rộng** nhưng **đóng để sửa đổi**.

Ý nghĩa thực dụng: khi thêm một behaviour mới, bạn nên **thêm code mới** (extension) hơn là sửa nhiều code cũ (modification) — đặc biệt code core/stable.

### 2.2 Dấu hiệu vi phạm OCP

- Mỗi lần thêm “loại mới” là phải sửa một `switch/case` lớn.
- Một change request tạo ra diff trải khắp codebase.

Ví dụ trong web:

- Thêm payment method mới (PayPal) phải sửa nhiều nơi.
- Thêm notification channel (SMS) phải sửa code gửi email.

### 2.3 Kỹ thuật áp dụng OCP (thực dụng)

1. **Polymorphism / Strategy**

- Tạo interface `PaymentProvider`.
- Mỗi provider là một implementation.
- Chọn provider bằng config/registry.

2. **Composition over inheritance**

- Thay vì kế thừa sâu, compose các behaviour.

3. **Plugin/registry**

- Một nơi đăng ký handlers theo key.

Ví dụ khái niệm (pseudo):

```ts
interface PaymentProvider {
	charge(input: ChargeInput): Promise<ChargeResult>
}

const providers: Record<string, PaymentProvider> = {
	stripe: new StripeProvider(...),
	paypal: new PaypalProvider(...),
}
```

### 2.4 OCP và API versioning

- OCP không có nghĩa “không bao giờ sửa API”.
- Nhưng bạn nên thiết kế để mở rộng payload (optional fields) và giữ backward compatible.

---

## 3) L — Liskov Substitution Principle (LSP)

### 3.1 Định nghĩa

> Nếu S là subtype của T, thì các object của T có thể được thay thế bằng S **mà không làm sai chương trình**.

Nói đơn giản: “implement interface/extend base class” phải giữ đúng **hợp đồng (contract)**.

### 3.2 Vi phạm LSP trông như thế nào?

- Subclass/implementation ném lỗi ở các method “không hỗ trợ”.
- Subclass thay đổi ý nghĩa của method, hoặc yêu cầu precondition mạnh hơn.
- Subclass trả về dữ liệu không đúng expectation (vd. null khi contract nói không).

Ví dụ web thực tế:

- Interface `EmailSender.send()` nhưng implementation `MockEmailSender` không gửi và cũng không lưu gì, khiến use case nghĩ là đã gửi.
- `CacheRepository.get()` của Redis implementation throw khi miss, trong khi contract kỳ vọng trả về `undefined/null`.

### 3.3 Cách tránh vi phạm LSP

- Viết contract rõ trong interface (input/output, error cases).
- Chuẩn hoá error types (Result/Exception mapping).
- Dùng test suite chung cho mọi implementation (contract tests).

Ví dụ: test chung cho `UserRepository` (create/find/update) chạy trên Postgres repo và InMemory repo.

---

## 4) I — Interface Segregation Principle (ISP)

### 4.1 Định nghĩa

> Không nên ép client phụ thuộc vào những method mà client không dùng.

Thực dụng: thay vì một interface “to” và nhiều method, hãy tách thành các interface nhỏ theo nhu cầu.

### 4.2 Dấu hiệu vi phạm ISP

- Interface có rất nhiều method, nhưng mỗi class chỉ implement được một phần.
- Có nhiều method throw `NotImplemented`.
- Thay đổi một method khiến rất nhiều implementation phải sửa dù không liên quan.

Ví dụ trong web:

- `UserRepository` gồm cả `searchUsers`, `exportUsers`, `deleteAll`, `streamUsers`…

### 4.3 Áp dụng ISP trong backend

- Tách interface theo use case:
  - `UserReader` (read)
  - `UserWriter` (write)
  - `UserSearch` (search)

Ví dụ khái niệm:

```ts
interface UserReader {
  findById(id: string): Promise<User | null>;
}
interface UserWriter {
  save(user: User): Promise<void>;
}
```

### 4.4 ISP trong frontend

- Props của component không nên là “mega-props”.
- Tách component theo use case UI: `UserList`, `UserRow`, `UserSearchBar`.

---

## 5) D — Dependency Inversion Principle (DIP)

### 5.1 Định nghĩa

> High-level modules không nên phụ thuộc low-level modules. Cả hai nên phụ thuộc vào **abstractions**.

Trong web backend:

- Use case (high-level) không phụ thuộc trực tiếp ORM/SDK (low-level)
- Use case phụ thuộc interface (port)
- ORM/SDK adapter implement interface đó

### 5.2 DIP giúp gì trong web?

- Dễ test: mock interface.
- Dễ thay integration: đổi Stripe ↔ Adyen, Postgres ↔ Mongo (trong giới hạn).
- Giảm coupling framework: code nghiệp vụ ít bị dính.

### 5.3 Composition root (nơi “lắp ráp” dependencies)

- Wiring/DI nên tập trung ở một nơi (bootstrap/module init).
- Tránh tạo dependencies rải rác trong domain.

### 5.4 DIP và Clean Architecture

Clean Architecture là một cách hiện thực DIP ở mức kiến trúc:

- Interfaces (ports) nằm ở layer application/domain.
- Implementations nằm ở layer infrastructure.

---

## 6) SOLID áp dụng vào những phần nào của web system?

### 6.1 Backend

- Controllers/handlers (SRP)
- Use cases/services (SRP, DIP)
- Repositories/adapters (ISP, LSP)
- Policies/strategies (OCP)

### 6.2 Frontend

- Components/hook boundaries (SRP)
- UI composition (OCP theo kiểu “plug-in components”)
- Abstraction của data fetching (DIP/ISP ở mức module)

### 6.3 Infrastructure as code / pipelines

SOLID chủ yếu cho code, nhưng tinh thần vẫn đúng:

- module hoá, tách trách nhiệm
- tránh file pipeline “god file”

---

## 7) Cân bằng: SOLID vs over-engineering

SOLID hay bị hiểu sai thành “mọi thứ phải có interface”. Thực dụng:

- Tạo abstraction khi:
  - có ít nhất 2 implementation
  - hoặc cần mock dễ trong tests
  - hoặc ranh giới với hệ thống ngoài (DB, payment, email)

- Không cần abstraction khi:
  - logic đơn giản, ít thay đổi
  - abstraction làm khó đọc hơn lợi ích mang lại

Rule of thumb:

- Abstraction có chi phí. Chỉ trả chi phí khi giảm rủi ro thay đổi.

---

## 8) Refactoring playbook (thực hành)

### 8.1 Khi gặp “God controller/service”

- Tách theo use case.
- Đẩy business logic khỏi controller vào use case.
- Tách integrations thành adapters.

### 8.2 Khi gặp `switch/case` theo type

- Dùng Strategy/registry.
- Mỗi type có handler riêng (OCP).

### 8.3 Khi interface quá to

- Tách thành các interface nhỏ (ISP).
- Viết contract tests để đảm bảo LSP.

### 8.4 Khi code nghiệp vụ dính ORM

- Tạo repository interface.
- Move mapping/ORM details ra adapter.
- Wiring qua DI.

---

## 9) Anti-patterns thường gặp khi “áp SOLID”

- **Interface cho mọi class** dù không cần.
- **Abstraction leak**: interface vẫn lộ query builder/HTTP details.
- **Inheritance lạm dụng**: hierarchy sâu khó hiểu (vi phạm SRP/OCP/LSP).
- **Mock quá mức** làm test brittle.
- **Chạy theo nguyên tắc** thay vì mục tiêu (dễ thay đổi, dễ test).

---

## 10) Checklist SOLID production-ready cho web

### SRP

- [ ] Controller mỏng, không chứa business logic
- [ ] Use case/service tách theo hành động nghiệp vụ
- [ ] Tách integrations thành adapters riêng

### OCP

- [ ] Tránh `switch/case` khổng lồ cho các biến thể
- [ ] Dùng strategy/registry cho provider/channel/type

### LSP

- [ ] Interfaces có contract rõ
- [ ] Implementations không “phá” pre/post conditions
- [ ] Có contract tests cho các adapters quan trọng

### ISP

- [ ] Interfaces nhỏ, đúng nhu cầu use case
- [ ] Không có method “không dùng” hoặc `NotImplemented`

### DIP

- [ ] Use case phụ thuộc interfaces, không phụ thuộc ORM/SDK
- [ ] DI/composition root rõ ràng
- [ ] Dễ viết unit test bằng mocks/fakes
