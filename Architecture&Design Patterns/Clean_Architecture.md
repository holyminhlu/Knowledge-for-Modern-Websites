---
title: Clean Architecture trong lập trình web
description: Handbook production-ready về Clean Architecture: Dependency Rule, layers (Entities/Use Cases/Interface Adapters/Frameworks), cách map vào web backend/API, testing, DI, data access, và anti-patterns.
---

# Clean Architecture trong lập trình web

## 0) Clean Architecture là gì?

**Clean Architecture** (tư tưởng phổ biến từ Robert C. Martin) là cách tổ chức code để:

- **Độc lập framework** (ít bị “dính” vào Express/Django/Spring…)
- **Độc lập UI** (web, mobile, CLI chỉ là “adapter”)
- **Độc lập database** (thay DB không kéo theo thay business logic)
- **Dễ test** (test domain/use case mà không cần chạy server/DB thật)

Trọng tâm là **tách bạch business rules** khỏi chi tiết triển khai (framework, DB, message broker, HTTP).

---

## 1) Nguyên tắc cốt lõi: Dependency Rule

> **Dependencies chỉ được hướng vào trong.**

Nghĩa là:

- Code “gần trung tâm” (Domain/Use case) **không import** code “vòng ngoài” (framework, DB, web controllers).
- Vòng ngoài có thể phụ thuộc vào vòng trong, nhưng không ngược lại.

Kết quả:

- Domain không biết HTTP là gì
- Use case không biết ORM là gì
- DB driver/framework chỉ là chi tiết thay thế

---

## 2) Các vòng/lớp trong Clean Architecture

Một cách mô tả phổ biến là 4 vòng (từ trong ra ngoài):

### 2.1 Entities (Domain model)

- Quy tắc nghiệp vụ cốt lõi: entity, value object, domain services.
- Ít thay đổi nhất.

Ví dụ trong web:

- `User`, `Order`, `Invoice`
- Value objects như `Money`, `Email`

### 2.2 Use Cases (Application business rules)

- Mỗi use case là một “hành động” của hệ thống: `CreateOrder`, `PayInvoice`, `ResetPassword`.
- Orchestrate domain + policy, nhưng **không** chứa chi tiết transport/DB.
- Thường giao tiếp qua **ports** (interfaces) như `UserRepository`, `PaymentGateway`.

### 2.3 Interface Adapters

- Chuyển đổi dữ liệu giữa thế giới ngoài và use case.
- Bao gồm:
  - Controllers/Handlers (HTTP)
  - Presenters/ViewModels (shape response)
  - Repositories implementations (ORM adapter)
  - Mappers (DTO ↔ domain)

### 2.4 Frameworks & Drivers

- Framework web (Express/Fastify, Spring MVC, Django)
- DB/ORM (Postgres driver, Prisma/Hibernate)
- Message broker client
- External services SDK

---

## 3) Map Clean Architecture vào backend web/API (thực tế)

### 3.1 Request flow (HTTP)

Luồng điển hình:

1. HTTP request vào Controller/Route handler (vòng ngoài)
2. Validate/parse request → tạo Input DTO
3. Gọi Use case (vòng trong)
4. Use case gọi Ports (interfaces) để truy cập DB/external
5. Trả Output model/Result
6. Presenter/Mapper → HTTP response

Điểm mấu chốt: Controller không chứa business logic; DB/ORM không “tràn” vào use case.

### 3.2 “Ports & Adapters” (Hexagonal) và Clean Architecture

Clean Architecture thường được triển khai theo kiểu:

- **Ports**: interfaces ở tầng use case (vd. `OrderRepository`, `EmailSender`)
- **Adapters**: implementations ở vòng ngoài (vd. `PostgresOrderRepository`, `SendGridEmailSender`)

Nhiều team gọi chung là Hexagonal/Onion/Clean; khác nhau tên gọi, giống nhau tinh thần.

---

## 4) Boundaries: tách module theo “business capability”

Nếu chỉ tách theo layer (controllers/services/repos) mà không theo domain, code dễ thành “layer cake”.

Gợi ý thực dụng:

- Tách theo **feature/bounded context** (vd. `billing`, `identity`, `catalog`)
- Bên trong mỗi feature áp Clean Architecture ở mức vừa đủ

Ví dụ cấu trúc thư mục (mang tính minh hoạ):

- `src/identity/domain`
- `src/identity/application` (use cases + ports)
- `src/identity/adapters/http`
- `src/identity/adapters/persistence`
- `src/shared` (cross-cutting: logging, clock, id generator)

---

## 5) Input validation ở đâu?

Thực tế có 2 lớp validation:

### 5.1 Transport-level validation (vòng ngoài)

- Validate shape: required fields, types, constraints cơ bản.
- Ví dụ: JSON schema, OpenAPI validation.

### 5.2 Business validation (use case/domain)

- Quy tắc nghiệp vụ: “không thể đặt hàng nếu account bị khoá”, “coupon hết hạn”.
- Phải nằm trong use case/domain để không bị bypass.

---

## 6) Data access: Repository pattern và mapping

### 6.1 Repository interface ở tầng use case

- Use case phụ thuộc vào interface: `UserRepository`.
- Interface mô tả các thao tác domain cần, không lộ ORM query builder.

### 6.2 ORM adapter ở vòng ngoài

- `SqlUserRepository` dùng ORM/SQL.
- Mapping giữa record/row và domain entity.

### 6.3 Tránh “leak” DB model vào domain

- Đừng để entity phụ thuộc annotation ORM (nếu khiến domain bị dính framework).
- Nếu chấp nhận dính (vì tốc độ dev), hãy xác định đó là trade-off, và vẫn giữ use case sạch.

---

## 7) DI (Dependency Injection) và composition root

Clean Architecture thường cần DI để nối ports ↔ adapters.

Nguyên tắc:

- Chỉ có **composition root** (thường ở layer framework) biết cách “lắp ráp” objects.
- Use case nhận dependencies qua constructor.

Ví dụ khái niệm:

- Use case: `CreateOrderUseCase(orderRepo, paymentPort, clock)`
- Adapter: `PostgresOrderRepository(dbClient)`
- Framework: wiring trong bootstrap/app module

---

## 8) Error handling và Result types

Để không “throw bừa” từ domain ra HTTP:

- Use case trả về **Result** (success/failure) với error codes domain-level.
- Controller mapping domain error → HTTP status.

Ví dụ mapping:

- `InvalidInput` → 400
- `Unauthorized` / `Forbidden` → 401/403
- `NotFound` → 404
- `Conflict` → 409

---

## 9) Transactions và consistency

Use case thường là nơi điều phối transaction.

Thực dụng:

- Nếu dùng DB transaction: adapter/persistence cung cấp `UnitOfWork`/transaction manager.
- Use case yêu cầu transaction qua port.

Tránh:

- để controller mở transaction rồi gọi nhiều use case (coupling).

---

## 10) Asynchronous + event-driven trong Clean Architecture

Event handler/consumer cũng là “delivery mechanism” giống HTTP.

Gợi ý:

- Consumer adapter parse message → gọi use case.
- Use case publish domain events qua port `EventBus`.
- Adapter triển khai publish (Kafka/Rabbit/SNS...).

---

## 11) Testing: lợi ích lớn nhất của Clean Architecture

### 11.1 Unit test cho domain/use case

- Mock ports (`UserRepository`, `EmailSender`).
- Test business rules nhanh, không cần DB.

### 11.2 Integration test cho adapters

- Test repository với DB thật/containers.
- Test HTTP routes với wiring thực.

### 11.3 Contract tests

- Dùng OpenAPI/consumer-driven contracts nếu có nhiều consumers.

---

## 12) Khi nào Clean Architecture bị “over-engineering”?

### Dấu hiệu bạn đang làm quá tay

- Tạo quá nhiều interfaces cho mọi thứ, trong khi chưa có nhu cầu thay thế.
- Quá nhiều “DTO/Mapper/Presenter” làm dev chậm.
- Domain quá mỏng, toàn logic nằm ở adapters.

### Cách áp dụng thực dụng

- Bắt đầu từ use case boundaries + ports quan trọng (DB/external).
- Với feature đơn giản, cho phép ít lớp hơn.
- Nâng cấp dần khi codebase lớn và team cần testability/maintainability.

---

## 13) Anti-patterns phổ biến

- **Use case import ORM model** hoặc query builder trực tiếp.
- **Controller chứa business logic** (lẫn lộn validation nghiệp vụ).
- **Domain phụ thuộc framework** (HTTP exceptions, annotations) không kiểm soát.
- **Anemic domain**: domain chỉ là data, logic rải rác khắp nơi.
- **Interface cho mọi thứ** dẫn tới “abstraction for abstraction”.
- **Không có composition root**: wiring rải rác, khó hiểu.

---

## 14) Checklist Clean Architecture production-ready

### Boundaries

- [ ] Domain/use case không phụ thuộc framework/DB
- [ ] Ports (interfaces) định nghĩa ở layer application
- [ ] Adapters triển khai ports ở layer ngoài

### Web/API mapping

- [ ] Controllers chỉ parse/validate transport và gọi use case
- [ ] Use case trả Result/error codes domain-level
- [ ] Presenter/mapper tách khỏi use case

### Data & external

- [ ] Repositories không leak ORM vào use case
- [ ] Transaction/UoW được quản lý rõ
- [ ] External SDK nằm trong adapters

### Testing & vận hành

- [ ] Unit test cho use cases (mock ports)
- [ ] Integration test cho adapters
- [ ] Logging/metrics/tracing không làm “bẩn” domain (qua ports)
