# Message Queue trong lập trình web (từ cơ bản đến production)

## 1) Message Queue là gì?

**Message Queue (MQ)** là cơ chế giao tiếp **bất đồng bộ (asynchronous)** giữa các thành phần trong hệ thống. Thay vì service A gọi trực tiếp service B và phải chờ phản hồi, A **gửi một message** vào một hệ thống trung gian (broker). B (consumer/worker) sẽ **nhận và xử lý message** khi sẵn sàng.

MQ thường được dùng như một “bộ đệm” và “kênh vận chuyển công việc/sự kiện” để:

- Tách rời (decouple) các dịch vụ
- Xử lý nền (background jobs)
- Cân bằng tải (buffer/load leveling)
- Truyền sự kiện (event-driven)
- Tăng độ tin cậy khi hệ downstream chậm/đang lỗi

## 2) Các thành phần cơ bản

Một pipeline MQ điển hình:

`Producer -> Broker -> Queue/Topic -> Consumer`

- **Producer**: nơi tạo message (API, service nghiệp vụ, cron, webhook receiver…)
- **Broker**: hệ thống trung gian giữ và phân phối message (RabbitMQ/Kafka/NATS/SQS…)
- **Queue/Topic/Stream**: nơi message “đi qua” (tuỳ công nghệ, thuật ngữ khác nhau)
- **Consumer/Worker**: tiến trình xử lý message

Thuật ngữ hay gặp:

- **Ack**: consumer xác nhận “đã xử lý xong” để broker đánh dấu hoàn tất.
- **Retry**: xử lý lại khi lỗi.
- **DLQ (Dead Letter Queue)**: nơi chứa message bị lỗi quá số lần retry.

## 3) Vì sao MQ quan trọng trong web?

### 3.1 Tăng trải nghiệm người dùng (không bắt user chờ)

Ví dụ: user bấm “Xuất báo cáo PDF 10 năm”

- Không nên xử lý đồng bộ vì dễ timeout
- Nên enqueue job → trả UI “đang xử lý” → worker tạo PDF → gửi email/notification khi xong

### 3.2 Chống “sập dây chuyền” khi downstream lỗi

Ví dụ: Order Service → Email Service

- Nếu Email Service down, Order vẫn tạo đơn được
- Email job nằm trong queue, xử lý bù sau

### 3.3 Cân bằng tải (traffic burst)

MQ hấp thụ spike (Black Friday), worker xử lý dần theo khả năng.

### 3.4 Là nền tảng cho Event-driven / Microservices

MQ/stream giúp publish domain events để các dịch vụ khác subscribe mà không cần gọi chéo trực tiếp.

## 4) Queue vs Topic vs Stream (phân biệt thực dụng)

> Nhiều broker có cả 3 kiểu hoặc biến thể.

### 4.1 Queue (Work Queue / Point-to-Point)

- 1 message thường được xử lý bởi **1 consumer** (trong một consumer group).
- Phù hợp cho **job processing**: gửi email, resize ảnh, tạo report, chạy ETL nhỏ.

### 4.2 Topic (Pub/Sub)

- 1 message được **phát cho nhiều subscriber**.
- Phù hợp cho **event**: `order.created`, `user.registered`.

### 4.3 Stream / Log (Kafka-style)

- Message được append vào log, có **offset**.
- Consumer đọc theo offset, có thể **replay**.
- Phù hợp cho: event sourcing, analytics pipeline, audit trail, integration phức tạp.

## 5) Delivery semantics: “có mất / có trùng”

Trong hệ phân tán, bạn thường phải chọn giữa:

- **At-most-once**: có thể mất message, thường không retry.
- **At-least-once** (phổ biến): không muốn mất, chấp nhận **có thể trùng**.
- “Exactly-once” end-to-end rất khó; thường đạt được bằng **idempotency**.

### 5.1 Idempotency (chống trùng)

Nếu consumer nhận lại cùng message, xử lý vẫn ra kết quả như cũ.

Gợi ý:

- Message có `messageId` (UUID) hoặc `(streamId, sequence)`.
- Consumer lưu “đã xử lý messageId chưa” (DB/Redis) để bỏ qua.
- Với side-effect (charge tiền), luôn dùng **idempotency key**.

## 6) Ordering (thứ tự)

Ordering “toàn hệ thống” là đắt. Thực tế thường cần:

- **Ordering theo key** (ví dụ theo `orderId`, `userId`, `roomId`).

Chiến lược:

- Partition theo key (Kafka)
- Route message theo key về cùng shard/queue
- Gắn `sequence` tăng dần trong từng stream

## 7) Ack, visibility timeout, và cơ chế xử lý lỗi

Tuỳ broker, cơ chế khác nhau:

- RabbitMQ/AMQP: message được “deliver”, consumer ack; nếu không ack → requeue.
- SQS: message có **visibility timeout**; nếu chưa delete trước timeout → có thể deliver lại.
- Kafka: commit offset sau khi xử lý; lỗi → không commit → đọc lại.

Điểm quan trọng: consumer crash giữa chừng luôn có thể gây **process lại**.

## 8) Retry chiến lược (rất quan trọng)

Không phải lỗi nào cũng nên retry giống nhau.

### 8.1 Phân loại lỗi

- **Transient**: timeout, network, rate limit → retry được.
- **Permanent**: dữ liệu sai schema, thiếu quyền → retry vô ích, nên đưa DLQ.

### 8.2 Exponential backoff + jitter

- Tránh “thác lũ retry” khi downstream đang hỏng.
- Ví dụ: 1s, 2s, 4s, 8s… cộng jitter ngẫu nhiên.

### 8.3 Retry queue / delayed message

- Một số broker hỗ trợ delay trực tiếp.
- Nếu không, bạn có thể:
  - dùng “retry topic” theo mốc thời gian (1m/5m/30m)
  - hoặc schedule job ở DB/Redis

### 8.4 Dead Letter Queue (DLQ)

- Message lỗi quá N lần → đưa vào DLQ.
- Có quy trình:
  - alert
  - inspect reason
  - fix bug/data
  - re-drive (đẩy lại) nếu cần

## 9) Poison message và cách phòng

**Poison message** là message luôn gây crash/timeout (dữ liệu xấu hoặc bug logic).

Phòng:

- Validate schema ngay khi consume
- Timeout xử lý (job timeout)
- Circuit breaker / bulkhead ở consumer
- Giới hạn retry và có DLQ

## 10) Schema, versioning và tương thích ngược

MQ khiến producer và consumer “tách rời” → schema drift là nguyên nhân gây lỗi phổ biến.

Khuyến nghị:

- Dùng **envelope** chuẩn:

```json
{
  "type": "order.created",
  "messageId": "uuid",
  "ts": 1700000000000,
  "key": "order:123",
  "schemaVersion": 1,
  "data": { "orderId": 123 }
}
```

- Nguyên tắc **backward compatible**:
  - chỉ thêm field optional
  - không đổi nghĩa field cũ
  - tránh đổi kiểu dữ liệu

Nếu traffic lớn, cân nhắc:

- Avro/Protobuf + schema registry
- Contract test giữa producer/consumer

## 11) Pattern kiến trúc quan trọng

### 11.1 Background job / Worker pattern

- Web API nhận request → enqueue job → trả 202/200 → worker xử lý.

### 11.2 Pub/Sub domain events

- Service nghiệp vụ publish event sau khi commit DB.
- Dịch vụ khác subscribe để cập nhật cache, gửi email, analytics…

### 11.3 Transactional Outbox (chống mất event)

Vấn đề kinh điển:

- Bạn update DB xong rồi publish event.
- Publish thất bại → DB đã đổi nhưng event không được gửi.

Giải pháp **Outbox**:

- Trong cùng transaction DB, ghi thêm record vào bảng `outbox`.
- Một process “relay” đọc outbox và publish ra broker.
- Có thể dùng CDC (Debezium) để đẩy outbox.

### 11.4 Saga (distributed transaction)

- Khi nhiều service tham gia một workflow (order → payment → inventory), MQ giúp orchestration/choreography.
- Cần có **compensation** khi step sau thất bại.

### 11.5 CQRS + Event Sourcing (nếu đi xa)

- Kafka/stream giúp lưu event log; read model build từ stream.
- Đổi lại: phức tạp, cần chiến lược snapshot, replay, schema evolution.

## 12) Consumer scaling: concurrency và consumer groups

### 12.1 Scale ngang

- Nhiều consumer cùng đọc 1 queue (work stealing).
- Với Kafka: consumer group + partitioning.

### 12.2 Độ song song (parallelism)

- Nếu cần ordering theo key, chỉ parallel giữa các key khác nhau.
- Giới hạn concurrency để tránh overload downstream.

### 12.3 Backpressure

- Nếu downstream chậm, đừng tăng worker vô hạn.
- Dùng:
  - rate limit
  - max in-flight
  - circuit breaker
  - queue length alerts

## 13) Thời gian sống, retention, và kích thước message

- Queue “job” thường không cần giữ lâu, nhưng cần TTL hợp lý.
- Stream (Kafka) thường giữ theo **retention time** hoặc **size**.

Kích thước message:

- Message nên nhỏ.
- Nếu payload lớn (file, ảnh), hãy gửi **pointer** (URL/object key) + metadata.

## 14) Bảo mật MQ

- **AuthN/AuthZ**: ai được publish/consume topic nào.
- **TLS** khi truyền message.
- **Encrypt payload** nếu có dữ liệu nhạy cảm.
- **PII hygiene**: tránh gửi dữ liệu nhạy cảm không cần thiết.
- **Rate limit** producer để tránh flood.

## 15) Observability cho MQ (để vận hành được)

### 15.1 Metrics quan trọng

- `queue_depth` / `lag` (Kafka consumer lag)
- `publish_rate` / `consume_rate`
- `processing_time_ms` (p50/p95/p99)
- `retry_count`, `dlq_count`
- `oldest_message_age`

### 15.2 Logging & tracing

- Log `messageId`, `type`, `key`.
- Propagate `traceId` từ request vào message để trace end-to-end.

## 16) Chọn công nghệ: RabbitMQ vs Kafka vs Redis vs Cloud

### 16.1 RabbitMQ (AMQP)

- Mạnh về routing (exchange, routing key), work queue.
- Dễ dùng cho job, command.

### 16.2 Kafka

- Mạnh về stream log, throughput rất lớn, replay.
- Hợp event-driven quy mô lớn, analytics.

### 16.3 Redis (Pub/Sub, Streams)

- Nhẹ, có sẵn nếu bạn dùng Redis.
- Pub/Sub không lưu (best-effort); Streams có persistence tốt hơn.

### 16.4 Cloud MQ (AWS SQS/SNS, GCP Pub/Sub, Azure Service Bus)

- Giảm gánh vận hành.
- Đổi lại: phụ thuộc cloud, giới hạn/thói quen API.

## 17) Ví dụ use case trong web

- **Gửi email/OTP/notification**: enqueue job, retry, DLQ.
- **Xử lý thanh toán**: idempotency + outbox + saga.
- **Thumbnail/Video processing**: job queue + autoscale worker.
- **Webhook ingestion**: buffer chống spike, xử lý tuần tự theo `accountId`.
- **Search indexing**: publish event `product.updated` → consumer cập nhật search engine.

## 18) Anti-patterns (lỗi hay gặp)

- Dùng MQ như “database thay thế” nhưng không có retention/compaction phù hợp
- Không có idempotency → trùng message gây double charge/double email
- Retry vô hạn → tự DDoS downstream
- Không có DLQ/alert → lỗi âm thầm, mất dữ liệu
- Message payload quá lớn → nghẽn broker và tăng chi phí
- Đổi schema phá vỡ consumer cũ (không backward compatible)

## 19) Checklist production (tóm tắt)

- Định nghĩa message envelope + schemaVersion + messageId
- Chọn semantics (thường at-least-once) và triển khai idempotency
- Thiết kế retry (backoff + jitter) + DLQ + re-drive
- Quy hoạch ordering theo key (nếu cần)
- Outbox (nếu cần đảm bảo không mất event)
- Metrics (depth/lag, processing time, dlq) + tracing
- Security: ACL topic/queue, TLS, hạn chế PII
