---
title: Layered Architecture trong lập trình web
description: Handbook production-ready về Layered Architecture (n-tier): các tầng Presentation/Application/Domain/Data, nguyên tắc dependency, cách áp dụng trong web backend/API, ưu/nhược, biến thể, pitfalls và checklist.
---

# Layered Architecture trong lập trình web

## 0) Layered Architecture là gì?

**Layered Architecture** (còn gọi là **n-tier architecture**) là cách tổ chức hệ thống thành các **tầng (layers)** với trách nhiệm rõ ràng, thường gặp nhất trong web app:

- **Presentation/UI layer**: HTTP controllers, views, API handlers
- **Application/Service layer**: orchestration nghiệp vụ ở mức “use case”
- **Domain layer**: business rules (entity, domain services)
- **Data/Infrastructure layer**: database access, external integrations

Mục tiêu:

- code dễ đọc/dễ phân công
- thay đổi UI/DB ít ảnh hưởng đến business
- testing và maintainability tốt hơn so với “spaghetti code”

---

## 1) Các tầng phổ biến (và trách nhiệm)

Không có một “chuẩn” duy nhất, nhưng các team thường dùng 3–5 tầng.

### 1.1 Presentation layer (Web/API)

Nhiệm vụ:

- parse request (path/query/body)
- authn/authz ở mức route (tuỳ thiết kế)
- validation dạng transport (schema/type/required)
- gọi Application layer
- map output → HTTP response

Không nên:

- nhét business logic
- gọi DB trực tiếp

### 1.2 Application layer (Service/Use case)

Nhiệm vụ:

- hiện thực các “use cases” (CreateOrder, CancelSubscription...)
- điều phối transaction
- gọi repository / external services
- enforce business rules ở mức workflow

### 1.3 Domain layer

Nhiệm vụ:

- entity/value objects
- invariant nghiệp vụ
- domain services (khi logic không thuộc entity cụ thể)

Domain nên “sạch”: ít phụ thuộc framework.

### 1.4 Data/Infrastructure layer

Nhiệm vụ:

- repository implementations
- ORM/SQL/driver
- integrations: email/SMS/payment
- message broker clients

---

## 2) Nguyên tắc phụ thuộc (Dependency direction)

Layered Architecture tốt nhất khi có quy tắc phụ thuộc rõ:

- Presentation → Application → Domain → Infrastructure/Data

Trong thực tế, để giảm coupling:

- **Domain không phụ thuộc Data**
- **Application phụ thuộc interface** (repository ports) thay vì phụ thuộc trực tiếp ORM (đây là điểm “tiệm cận” Clean Architecture)

Tối thiểu, bạn nên tránh:

- Controller gọi thẳng ORM
- Domain import HTTP/DB exceptions

---

## 3) Luồng xử lý request trong web backend theo layers

Một request API điển hình:

1. Controller nhận request
2. Validate + convert sang input DTO
3. Gọi Application service (use case)
4. Application service gọi repositories/integrations
5. Domain entities kiểm tra invariant / tính toán
6. Application service trả result
7. Controller trả HTTP response

---

## 4) Variants: 3-layer, 4-layer, n-tier và “onion-ish” layered

### 4.1 Classic 3-layer

- Presentation
- Business (Application)
- Data access

Phù hợp hệ thống nhỏ–vừa.

### 4.2 Thêm Domain layer rõ ràng

- Presentation
- Application
- Domain
- Infrastructure

Giúp business rules được “đóng gói” tốt hơn.

### 4.3 Layered + Ports/Adapters

- Application/Domain định nghĩa interfaces
- Infrastructure implements

Đây là cách áp dụng thực dụng để giữ layered đơn giản nhưng vẫn testable.

---

## 5) So sánh nhanh: Layered vs Clean Architecture

Giống nhau:

- đều tách trách nhiệm
- đều cố giảm coupling

Khác nhau thực dụng:

- **Layered** thường mô tả theo “tầng kỹ thuật” (presentation/business/data), dễ hiểu, dễ bắt đầu.
- **Clean Architecture** nhấn mạnh mạnh hơn về **Dependency Rule** và “framework là chi tiết”, thường dùng ports/adapters rõ ràng hơn.

Bạn có thể bắt đầu layered và dần “làm sạch” hướng Clean bằng cách:

- đưa business rules vào domain/use case
- đảo phụ thuộc qua interfaces (DI)

---

## 6) Ưu điểm

- Dễ onboarding: ai cũng hiểu controller/service/repo.
- Dễ phân chia công việc.
- Thay đổi một tầng ít ảnh hưởng tầng khác nếu boundary tốt.
- Dễ tổ chức testing theo tầng (unit/integration).

---

## 7) Nhược điểm và rủi ro

### 7.1 Coupling ngầm

- Nếu không có rule rõ, code vẫn “đi tắt” giữa tầng.

### 7.2 Anemic domain

- Domain chỉ là DTO, logic nằm hết trong services.

### 7.3 Over-layering

- Tạo quá nhiều lớp/abstractions cho hệ thống nhỏ.

### 7.4 Leakage của persistence model

- ORM entities trở thành domain entities và kéo theo DB concerns.

---

## 8) Best practices khi áp dụng Layered Architecture trong web

### 8.1 Định nghĩa ranh giới rõ ràng

- Controller: transport concerns
- Application service: orchestration
- Domain: rules/invariants
- Repository: data access

### 8.2 Validation 2 lớp

- Transport validation ở controller
- Business validation ở application/domain

### 8.3 Transaction boundary

- Application service thường là nơi mở/commit transaction.

### 8.4 DTO/Mapper (vừa đủ)

- DTO cho API input/output
- Mapper để domain không dính vào API shape

### 8.5 Logging/observability

- Logging ở boundary (controller/application) để tránh “bẩn” domain.
- Correlation id/trace id xuyên suốt request.

---

## 9) Anti-patterns phổ biến

- **Controller gọi DB trực tiếp**.
- **Service layer thành “God service”**: quá to, làm mọi thứ.
- **Domain là DTO rỗng** (anemic domain) + logic rải rác.
- **Repository trả về ORM entity** và bị dùng khắp nơi.
- **Phá luật phụ thuộc**: domain import framework exceptions/config.
- **N-tier chỉ là thư mục**: đặt tên layer nhưng không enforce boundaries.

---

## 10) Checklist Layered Architecture production-ready

### Thiết kế

- [ ] Xác định rõ các layers và trách nhiệm
- [ ] Quy ước dependency direction (không gọi tắt)
- [ ] Business rules nằm trong application/domain, không nằm ở controller

### Dữ liệu

- [ ] Repository che giấu ORM/SQL khỏi application
- [ ] Mapping DTO ↔ domain rõ ràng
- [ ] Transaction boundary ở application

### Chất lượng

- [ ] Unit tests cho domain/application
- [ ] Integration tests cho persistence adapters
- [ ] Observability (logs/metrics/tracing) theo boundary
