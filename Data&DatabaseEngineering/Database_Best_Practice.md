# Database Best Practices trong lập trình web (tất tần tật, thực chiến)

> Tài liệu này tập trung vào best practices “production”: thiết kế schema, tối ưu query/index, transaction/concurrency, migration, backup/restore, scale, security, observability.

## 1) Chọn loại database đúng bài toán

### 1.1 Relational DB (PostgreSQL/MySQL/SQL Server)

Hợp khi:

- Dữ liệu quan hệ rõ ràng
- Cần ACID transactions
- Cần query phức tạp, join, reporting

### 1.2 Document DB (MongoDB)

Hợp khi:

- Dữ liệu linh hoạt, schema thay đổi nhanh
- Aggregate theo document, ít join

### 1.3 Key-value / Cache (Redis)

Hợp khi:

- Cache, session, rate limit, queue nhẹ
- Latency cực thấp

### 1.4 Search engine (Elasticsearch/OpenSearch)

- Dành cho full-text search, ranking, faceting.
- Không thay DB chính.

Nguyên tắc:

- Chọn DB theo access pattern, consistency và khả năng vận hành.
- Một hệ thường dùng nhiều loại (polyglot persistence) nhưng tránh phức tạp quá sớm.

## 2) Data modeling & schema design

### 2.1 Thiết kế từ use case và query

Đừng thiết kế chỉ dựa trên “thực thể” (entity). Hãy bắt đầu bằng:

- Những API/query chính (read/write)
- Tần suất và latency budget
- Cardinality (1-1, 1-n, n-n)

### 2.2 Normalization vs Denormalization

- **Normalize** (chuẩn hoá) để tránh trùng dữ liệu, dễ đảm bảo tính đúng.
- **Denormalize** khi read-heavy và join quá đắt (nhưng cần cơ chế sync/cập nhật).

Thực dụng:

- Bắt đầu normalize ở mức hợp lý (3NF-ish).
- Denormalize có chủ đích: materialized view, cache table, counter table…

### 2.3 Keys: surrogate key vs natural key

- Surrogate key (ID tự sinh) thường dễ dùng.
- Natural key (email, code) có thể đổi → đừng dùng làm PK nếu có thể thay đổi.

### 2.4 UUID vs auto-increment

- Auto-increment: nhỏ, index tốt, nhưng lộ số lượng và khó merge multi-region.
- UUID: phân tán tốt, nhưng index lớn và có thể gây fragmentation.

Gợi ý:

- Nếu dùng UUID, cân nhắc UUID v7/ULID (gần tăng dần) để tốt cho index.

### 2.5 Constraints và data integrity

Luôn dùng:

- `NOT NULL` cho field bắt buộc
- `UNIQUE` cho định danh logic
- `FOREIGN KEY` (nếu phù hợp) để đảm bảo quan hệ
- `CHECK` cho ràng buộc giá trị

Lưu ý:

- FK giúp data integrity, nhưng cần cân nhắc chi phí write/lock ở workload cực lớn.

### 2.6 Soft delete vs hard delete

- Soft delete (`deleted_at`) giúp audit/restore.
- Nhưng làm query phức tạp (phải filter `deleted_at IS NULL`) và index.

Khuyến nghị:

- Soft delete cho dữ liệu nghiệp vụ quan trọng.
- Hard delete cho log/temporary data hoặc theo retention policy.

### 2.7 Multi-tenant (SaaS) modeling

Hai cách phổ biến:

- **Shared database, shared schema**: mỗi table có `tenant_id` (phổ biến nhất)
- **Database per tenant**: isolate mạnh, nhưng vận hành phức tạp

Best practices shared schema:

- Mọi bảng nghiệp vụ có `tenant_id`.
- Index theo `(tenant_id, ...)`.
- Enforce isolation ở app và/hoặc DB (Row-Level Security nếu dùng Postgres).

## 3) Indexing – vừa đủ, đúng chỗ

### 3.1 Nguyên tắc index

- Index tăng tốc đọc, nhưng làm chậm ghi và tốn disk.
- Index phải phục vụ query thực tế (WHERE, JOIN, ORDER BY).

### 3.2 Composite index và thứ tự cột

- Đặt cột có tính lọc cao và thường dùng trong WHERE lên trước.
- Với multi-tenant, thường `(tenant_id, created_at)` hoặc `(tenant_id, status, created_at)`.

### 3.3 Covering index

- Index có thể “cover” query nếu chứa đủ columns để DB không cần đọc table.
- Dùng có chọn lọc cho hot paths.

### 3.4 Index cho text search

- SQL `LIKE '%term%'` thường không dùng index bình thường.
- Dùng full-text index (Postgres tsvector) hoặc search engine.

### 3.5 Anti-patterns về index

- Tạo index “cho chắc” không dựa trên query.
- Quên index cho foreign keys/hot join columns.
- Index quá nhiều columns khiến write chậm nặng.

## 4) Query best practices

### 4.1 Chỉ lấy những gì cần

- Tránh `SELECT *`.
- Tránh trả payload khổng lồ.

### 4.2 Pagination đúng

- Offset pagination (`LIMIT/OFFSET`) dễ dùng nhưng chậm ở page sâu.
- Keyset pagination (seek): dùng `WHERE (created_at, id) < (...)`.

### 4.3 Tránh N+1

- Dùng join/IN/batch query.
- Nếu dùng ORM, bật eager loading đúng chỗ.

### 4.4 Chuẩn hoá cách viết query

- Dùng prepared statements/parameterized query.
- Không nối string để tránh SQL injection.

### 4.5 Đọc plan

- Với Postgres: `EXPLAIN (ANALYZE, BUFFERS)`.
- Với MySQL: `EXPLAIN`.

Mục tiêu:

- Biết query scan bao nhiêu row
- Biết dùng index nào
- Biết có sort/hash join nặng không

## 5) Transactions, isolation và concurrency

### 5.1 ACID và khi nào cần transaction

Transaction dùng khi:

- Nhiều thao tác phải “all-or-nothing”
- Cần consistency giữa nhiều bảng

### 5.2 Isolation levels (tóm lược)

- Read committed (phổ biến): tránh dirty read
- Repeatable read: ổn định trong transaction
- Serializable: mạnh nhất, dễ conflict hơn

Chọn isolation theo trade-off giữa correctness và throughput.

### 5.3 Locking và deadlocks

Best practices:

- Giữ transaction ngắn.
- Update theo thứ tự nhất quán để giảm deadlock.
- Tránh làm network call trong transaction.
- Đặt timeout cho lock/statement.

### 5.4 Optimistic concurrency control

- Dùng `version`/`updated_at` để detect lost update.
- Khi update: `WHERE id=? AND version=?`.

Hợp với web vì request rời rạc và tranh chấp không quá cao.

## 6) Connection management (điểm hay gây sập hệ)

### 6.1 Connection pooling

- Đừng mở connection mới cho mỗi request.
- Dùng pool ở app.

### 6.2 Pool size

- Không phải càng lớn càng tốt.
- Pool quá lớn → DB overload, context switching.

Thực dụng:

- Bắt đầu nhỏ, đo p95 query time, saturations, rồi tăng dần.

### 6.3 N+1 connections trong microservices

- Nhiều service mỗi service mở pool lớn → DB bị “connection storm”.
- Cân nhắc:
  - giảm pool
  - dùng pgbouncer/proxy
  - read replicas

## 7) Migrations & schema evolution

### 7.1 Nguyên tắc migration an toàn

- Migration phải **backward compatible** với version app đang chạy.
- Chia thành nhiều bước:
  1.  add column nullable
  2.  deploy code ghi cả cũ/mới
  3.  backfill
  4.  switch read sang cột mới
  5.  add constraint NOT NULL / drop cột cũ

### 7.2 Tránh lock bảng lâu

- Tránh alter table nặng giờ cao điểm.
- Với index lớn, dùng concurrent index (tuỳ DB).

### 7.3 Versioning

- Migrations phải có source control.
- Có quy ước chạy trong CI/CD.

## 8) Backup, restore, và DR (disaster recovery)

### 8.1 Backup

- Full backup định kỳ.
- Incremental/WAL backup để point-in-time recovery (PITR).

### 8.2 Restore test

- Backup không có giá trị nếu chưa từng restore thử.
- Định kỳ diễn tập restore.

### 8.3 RPO/RTO

- RPO: mất dữ liệu tối đa chấp nhận (ví dụ 5 phút).
- RTO: thời gian khôi phục tối đa chấp nhận (ví dụ 30 phút).

## 9) Replication, read replicas và scaling

### 9.1 Read replicas

- Scale read, giảm tải primary.
- Lưu ý **replication lag**: read-after-write có thể sai.

Chiến lược:

- Read-your-writes: route read quan trọng về primary trong một thời gian.

### 9.2 Partitioning/sharding

- Partition theo thời gian (logs) hoặc theo tenantId.
- Sharding tăng phức tạp (cross-shard queries, transactions).

Làm khi:

- Một DB node không còn đủ.

## 10) Caching và data access

### 10.1 Cache đúng chỗ

- Cache query/results hot.
- Cache permission/session/rate limit.

### 10.2 Cache invalidation

- Luôn có strategy invalidation hoặc TTL.
- Dùng event để invalidate (pub/sub) nếu cần.

### 10.3 Tránh cache stampede

- Single-flight, request coalescing.
- Stale-while-revalidate.

## 11) Security best practices

### 11.1 SQL Injection

- Parameterized query.
- ORM đúng cách.
- Không build SQL bằng string.

### 11.2 Principle of least privilege

- App user DB chỉ có quyền cần thiết.
- Tách role đọc/ghi nếu có replicas.

### 11.3 Secrets management

- Không hardcode password DB.
- Dùng secret manager/env vars.
- Rotate credentials.

### 11.4 Encryption

- TLS in-transit.
- Encryption at-rest (disk/volume).
- Với dữ liệu cực nhạy cảm: application-level encryption.

### 11.5 Auditing

- Log truy cập dữ liệu nhạy cảm.
- Theo dõi query bất thường.

## 12) Observability (để debug được)

### 12.1 Metrics nên có

- p50/p95/p99 query latency
- slow query count
- connection count
- CPU/IO utilization
- buffer cache hit ratio
- lock waits, deadlocks
- replication lag

### 12.2 Slow query log

- Bật slow query log (ngưỡng phù hợp).
- Đừng log dữ liệu nhạy cảm.

### 12.3 Tracing

- Propagate `traceId` từ request đến DB calls.
- Tag query name (không log raw query nếu chứa PII).

## 13) ORM best practices (nếu dùng)

- Biết ORM generate SQL gì.
- Tránh N+1.
- Dùng transaction rõ ràng.
- Đừng dùng ORM cho bulk processing nếu tạo hàng nghìn queries nhỏ.

## 14) Data lifecycle: retention, archiving, GDPR

- Có retention policy cho logs/events.
- Archive dữ liệu cũ sang cold storage.
- Có quy trình xóa dữ liệu theo yêu cầu (nếu cần compliance).

## 15) Anti-patterns (lỗi hay gặp)

- `SELECT *` + trả payload lớn
- Không index cho hot queries
- Transaction dài + network call trong transaction
- Pool size quá lớn → DB quá tải
- Migration lock bảng giờ cao điểm
- Không test restore
- Dùng read replica mà quên replication lag
- Cache không có invalidation
- App dùng DB user quyền `SUPERUSER`

## 16) Checklist production (tóm tắt)

- Model theo query + integrity bằng constraints
- Index theo hot paths, kiểm tra bằng EXPLAIN
- Transaction ngắn, timeout rõ, xử lý deadlock
- Connection pool có giới hạn và được đo đạc
- Migration backward compatible, tránh lock lâu
- Backup + PITR + diễn tập restore
- Replicas + chiến lược read-your-writes
- Security: parameterized queries, least privilege, secrets, TLS
- Observability: slow queries, lock waits, replication lag

---

Nếu bạn muốn, mình có thể bổ sung thêm một phần riêng cho **PostgreSQL best practices** (index types, vacuum, autovacuum, bloat) hoặc **MySQL best practices** (InnoDB, isolation, binlog) tuỳ hệ bạn hay dùng.
