---
title: SQL Injection
description: Handbook phòng thủ SQL Injection (SQLi) cho hệ thống web: nguyên nhân, điểm yếu phổ biến, cách phòng chống bằng parameterized queries/ORM, validation, least privilege, logging/monitoring, testing và checklist production.
---

# SQL Injection trong lập trình web

## 0) Phạm vi

Tài liệu này tập trung vào **phòng chống SQL Injection** và hardening cho production. Không nhằm hướng dẫn khai thác.

---

## 1) SQL Injection là gì?

**SQL Injection (SQLi)** là lỗ hổng xảy ra khi ứng dụng xây dựng câu lệnh SQL bằng cách **ghép chuỗi từ input không tin cậy** (user input) khiến kẻ tấn công có thể làm thay đổi ý nghĩa truy vấn.

Hậu quả có thể bao gồm:

- Đọc/trích xuất dữ liệu nhạy cảm
- Sửa/xoá dữ liệu
- Bypass authentication/authorization (tuỳ trường hợp)
- Leo thang tác động do quyền DB quá rộng

SQLi là một trong các rủi ro phổ biến nhất của web apps khi:

- có nhiều endpoint truy vấn DB
- thiếu chuẩn hoá data access layer
- dùng dynamic SQL bừa bãi

---

## 2) Root cause: vì sao SQLi xảy ra?

Nguyên nhân gốc thường là:

- **String concatenation** để tạo SQL
- Không dùng **prepared statements / parameterized queries**
- “Escape thủ công” thay vì parameterization
- Query builder/ORM bị dùng sai cách (raw SQL không bind params)
- Dynamic SQL (ORDER BY, column name) không allowlist

Điểm quan trọng:

- SQLi không chỉ ở “form login”; nó có thể xuất hiện ở search, filter, sorting, admin tools, reporting.

---

## 3) Những điểm dễ dính SQLi trong web

### 3.1 Search/filter endpoints

- Query nhận nhiều tham số (q, filters, ranges).

### 3.2 Sorting/pagination

- `sortBy`, `order`, `page`, `limit`.
- Sorting thường dẫn tới dynamic SQL phần column/direction.

### 3.3 Reporting/analytics nội bộ

- Admin/report endpoints đôi khi ít review, dễ dính raw SQL.

### 3.4 Multi-tenant queries

- Nếu tenant scope bị gắn vào SQL bằng cách ghép chuỗi, nguy cơ cao.

### 3.5 “IN (...)” với danh sách IDs

- Dễ bị ghép chuỗi danh sách.
- Cần bind array/expand parameters đúng cách.

---

## 4) Phòng chống: nguyên tắc vàng

### 4.1 Dùng parameterized queries (bắt buộc)

- Luôn bind values bằng parameters.
- Không ghép string để đưa values vào SQL.

Ghi nhớ:

- Parameterization bảo vệ phần **values**.
- Nó **không** parameterize được tên bảng/cột hoặc keyword SQL.

### 4.2 Dùng ORM/Query builder đúng cách

- Ưu tiên ORM/query builder để tránh raw SQL.
- Nếu dùng raw SQL:
  - phải bind params
  - tránh string interpolation

### 4.3 Dynamic SQL: chỉ dùng allowlist

Các phần không thể parameterize (table/column/order direction) phải:

- map từ input → tập giá trị cố định
- reject mọi input ngoài allowlist

Ví dụ cách tiếp cận (khái niệm):

- Input `sortBy=createdAt` → map sang `orders.created_at`
- Input `order=desc` → map sang `DESC`

### 4.4 Least privilege cho DB user

- App user chỉ có quyền cần thiết (SELECT/INSERT/UPDATE đúng schema).
- Tránh dùng superuser/owner.
- Tách user theo service, theo environment.

### 4.5 Không dựa vào escaping thủ công

- Escaping dễ sai và phụ thuộc DB/driver.
- Parameterized queries mới là cách chuẩn.

---

## 5) Validation có giúp chống SQLi không?

**Validation là lớp bổ sung**, không phải lớp chính.

- Validation giúp giảm input bất thường và bug.
- Nhưng validation không thay thế parameterization.

Thực hành tốt:

- Validate type (int/uuid), length, pattern.
- Canonicalize (trim, normalize) khi cần.
- Reject “unknown fields” với filter objects.

---

## 6) Safe patterns cho các bài toán hay gặp

### 6.1 Pagination

- Bind `limit`/`offset` như parameters (và validate range).
- Giới hạn `limit` tối đa để tránh DoS.

### 6.2 Sorting

- Allowlist `sortBy` và `order`.
- Không bind trực tiếp tên cột từ input.

### 6.3 LIKE / full-text search

- Bind pattern như parameter.
- Escape wildcard nếu business yêu cầu “literal search”.

### 6.4 IN list

- Dùng driver/ORM hỗ trợ bind array.
- Nếu phải expand placeholders, làm bằng API driver, không ghép string.

### 6.5 JSON queries

- Validate cấu trúc filter.
- Không pass JSON trực tiếp vào “raw where string”.

---

## 7) Stored procedures có chống SQLi không?

- **Không tự động** chống SQLi.
- Nếu stored procedure cũng build dynamic SQL bằng string concat, vẫn dính.

Stored procedures giúp:

- chuẩn hoá logic
- giảm bề mặt truy cập bảng

Nhưng vẫn cần:

- parameters đúng
- avoid dynamic SQL không allowlist

---

## 8) Logging, monitoring và phát hiện sớm

### 8.1 Audit và DB monitoring

- Theo dõi các query bất thường:
  - query tần suất cao
  - query chậm
  - spike errors
- Bật slow query logs (cân nhắc chi phí).

### 8.2 Ứng dụng

- Log error codes từ DB driver.
- Không log raw SQL kèm values nhạy cảm.

### 8.3 WAF / RASP

- WAF có thể chặn payload phổ biến, nhưng:
  - có false positives/negatives
  - không thay thế fix trong code

---

## 9) Testing & secure SDLC

### 9.1 SAST

- Bật rule phát hiện string concatenation với SQL.

### 9.2 Unit/Integration tests

- Test data access layer đảm bảo dùng parameter binding.
- Test allowlist sorting/filters.

### 9.3 DAST

- Scan ở staging với rule SQLi.

### 9.4 Code review checklist

- Mọi raw SQL phải:
  - dùng parameters
  - không interpolate
  - có allowlist cho phần dynamic

---

## 10) Giảm thiểu tác động (blast radius)

Ngay cả khi lỡ có bug, bạn vẫn giảm thiệt hại bằng:

- DB user least privilege
- Network segmentation (DB không public)
- Separate schemas/tenants
- Backups + recovery drills
- Alerting nhanh

---

## 11) Checklist chống SQL Injection (production)

### Code

- [ ] Mọi truy vấn dùng prepared statements/parameterized queries
- [ ] Không string concat/interpolation vào SQL
- [ ] Sorting/columns/tables dùng allowlist mapping
- [ ] Pagination validate range, cap `limit`
- [ ] IN lists dùng bind arrays/driver expansion

### DB & infra

- [ ] DB users least privilege
- [ ] DB không public, network policies đúng
- [ ] Monitoring slow queries + error spikes

### Process

- [ ] SAST bật cho SQLi patterns
- [ ] Code review checklist cho raw SQL
- [ ] DAST scan định kỳ

---

## 12) Anti-patterns

- **Escape thủ công** và tin rằng “đã an toàn”.
- **Dùng superuser DB** cho ứng dụng.
- **Dynamic SQL không allowlist** (sorting/filtering tuỳ ý).
- **Log raw SQL + values** (lộ PII/secrets).
- **Chỉ dựa vào WAF** mà không sửa code.
