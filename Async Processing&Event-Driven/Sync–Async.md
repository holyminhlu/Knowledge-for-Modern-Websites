# Sync – Async trong lập trình web (tất tần tật, tránh nhầm lẫn)

> “Sync/Async” bị dùng ở nhiều tầng khác nhau. Tài liệu này tách bạch rõ:
>
> - Sync/Async ở **mức API/kiến trúc** (request/response vs background/event)
> - Sync/Async ở **mức code** (async/await, Promise, callback)
> - **Blocking vs Non-blocking** ở **mức IO/runtime** (thread, event loop)

## 1) Định nghĩa nhanh

### 1.1 Synchronous (đồng bộ)

Ở mức API:

- Client gọi request và **chờ** server xử lý xong rồi trả kết quả trong cùng một vòng request/response.

Ở mức code:

- Hàm chạy theo trình tự, câu lệnh sau **đợi** câu lệnh trước hoàn thành.

### 1.2 Asynchronous (bất đồng bộ)

Ở mức API:

- Client gửi yêu cầu, server **không nhất thiết trả kết quả ngay**. Kết quả có thể đến sau qua polling, webhook, notification, email…

Ở mức code:

- Hàm có thể “khởi động” một tác vụ và **trả quyền điều khiển** ngay; kết quả quay lại qua callback/promise/future/await.

### 1.3 Blocking vs Non-blocking (dễ nhầm với sync/async)

- **Blocking**: thread bị “đứng” chờ IO (DB/network/file) xong mới làm tiếp.
- **Non-blocking**: thread không đứng chờ; runtime sẽ báo lại khi IO xong (event/callback/await).

Một hệ có thể:

- API sync nhưng runtime non-blocking (ví dụ: HTTP request trả kết quả ngay, nhưng server dùng async IO để scale tốt).
- API async nhưng runtime lại blocking (ví dụ: enqueue job nhưng worker dùng code blocking, vẫn OK tuỳ tải).

## 2) Sync vs Async ở mức sản phẩm/API (cái user nhìn thấy)

### 2.1 Khi nào nên làm API synchronous?

Phù hợp khi:

- Tác vụ **nhanh** và kết quả cần ngay (login, check permission, validate input).
- Kết quả là “điều kiện” để UI đi tiếp (ví dụ: thanh toán step-by-step).
- Có thể đảm bảo latency trong budget (thường p95 < 300–800ms tuỳ sản phẩm).

Ưu:

- Dễ hiểu cho client, ít state.
- Dễ debug hơn (một request có response).

Nhược:

- Dễ timeout nếu xử lý nặng.
- Tăng coupling và lan truyền lỗi (downstream chậm → upstream chậm).

### 2.2 Khi nào nên làm API asynchronous?

Phù hợp khi:

- Tác vụ **nặng/không đoán trước** (export report, xử lý media, batch operations).
- Cần chống spike (buffer bằng queue).
- Có workflow dài nhiều bước (orchestration/saga).

Ưu:

- Tránh timeout, chống overload.
- Tách rời services, tăng resilience.

Nhược:

- UX phức tạp hơn (user chờ “processing…”).
- Cần thiết kế theo eventual consistency.

## 3) Mô hình API async phổ biến trong web

### 3.1 202 Accepted + Job ID (pattern kinh điển)

Flow:

1. Client gọi `POST /exports`
2. Server trả `202 Accepted` + `jobId`
3. Client polling `GET /exports/{jobId}` hoặc nhận notification/webhook

Gợi ý response:

```json
{
  "jobId": "...",
  "status": "queued",
  "statusUrl": "/exports/..."
}
```

### 3.2 Webhook callback

- Hợp với B2B / tích hợp hệ thống.
- Cần chữ ký (HMAC) + retry + idempotency.

### 3.3 Real-time push (SSE/WebSocket)

- Khi muốn UI cập nhật trạng thái job theo thời gian thực.
- Vẫn nên có endpoint “query trạng thái” làm nguồn sự thật.

### 3.4 Email/Notification

- Dùng khi kết quả không cần ở trong UI ngay lập tức.

## 4) Sync/Async ở mức hệ thống: coupling, consistency, và failure modes

### 4.1 Coupling

- Sync call (HTTP/gRPC) tạo coupling thời gian: downstream chậm → upstream chậm.
- Async (queue/event) giảm coupling: producer không cần consumer “đang sống”.

### 4.2 Consistency

- Sync thường hướng tới “read-your-write” nhanh.
- Async thường dẫn đến **eventual consistency**.

Ví dụ:

- User tạo order xong, vài giây sau mới thấy email/notification.
- Search index cập nhật trễ so với DB.

### 4.3 Lỗi và retry

- Sync: retry ở client/gateway có thể gây double submit nếu không có idempotency.
- Async: retry ở consumer có thể gây xử lý trùng nếu không idempotent.

Kết luận: **idempotency** quan trọng cho cả sync và async.

## 5) Sync vs Async ở mức code (ngôn ngữ/lập trình)

### 5.1 JavaScript: Event loop, Promise, async/await

- JS trên browser/Node là single-threaded (ở mức event loop) nhưng có async IO.
- `async/await` chỉ là cú pháp giúp viết code async “giống sync”.

Ví dụ:

```js
async function handler() {
  const user = await fetch("/api/me").then((r) => r.json());
  return user;
}
```

Điểm cần nhớ:

- `await` không “block OS thread” theo kiểu truyền thống, nhưng nó “pause” function.
- Nếu bạn chạy CPU-bound nặng trong Node (ví dụ parse file lớn), bạn vẫn làm nghẽn event loop.

### 5.2 Python: sync vs asyncio

- Python sync (requests) thường blocking.
- `asyncio`/`await` giúp concurrency IO-bound tốt hơn.
- Với CPU-bound, cần multiprocessing hoặc offload.

### 5.3 Java/.NET: threads + async IO

- Java có thread-per-request truyền thống; hiện đại có reactive/non-blocking.
- .NET hỗ trợ async/await + async IO rất mạnh.
- Dù có async IO, nếu bạn làm CPU-bound nặng vẫn phải scale CPU hoặc offload.

## 6) Blocking vs Non-blocking IO (tác động đến throughput)

### 6.1 Tại sao non-blocking giúp scale?

Với workload IO-bound:

- Blocking: mỗi request giữ thread chờ DB/network → cần rất nhiều thread.
- Non-blocking: ít thread hơn vẫn phục vụ nhiều concurrent connections.

Tuy nhiên:

- Non-blocking tăng độ phức tạp (debug/stack trace, backpressure).
- Không “thần thánh” với CPU-bound.

### 6.2 Một số “bẫy” làm hệ non-blocking thành blocking

- Gọi library blocking trong code async.
- Serialize/deserialize quá nặng trên event loop.
- Logging synchronous quá nhiều.

## 7) Bất đồng bộ trong kiến trúc web: các pattern quan trọng

### 7.1 Background Jobs + Message Queue

- API enqueue → worker xử lý.
- Cần retry, DLQ, metrics.

### 7.2 Event-driven (Pub/Sub)

- Publish domain event (`order.created`) → nhiều subscriber.
- Tránh gọi chéo hàng loạt.

### 7.3 Transactional Outbox (chống mất event)

- Ghi DB + outbox trong cùng transaction.
- Relay publish ra broker.

### 7.4 Saga (workflow nhiều bước)

- Async step-by-step, có compensation.
- Chọn orchestration (1 orchestrator) hoặc choreography (các service tự phản ứng).

## 8) Thiết kế UX cho async (đừng làm user hoang mang)

### 8.1 Trạng thái job rõ ràng

Các trạng thái phổ biến:

- `queued` → `running` → `succeeded` / `failed` / `canceled`

### 8.2 Progress và “kết quả cuối”

- Nếu có progress thật, cung cấp `progressPercent`.
- Nếu không, chỉ hiển thị “đang xử lý” để tránh số % giả.

### 8.3 Nút retry / re-run

- Cho phép user trigger lại job an toàn (idempotent hoặc tạo job mới có liên kết).

## 9) Timeouts, circuit breaker, và bulkhead

### 9.1 Sync call

- Luôn đặt timeout ngắn, rõ ràng.
- Dùng circuit breaker để tránh gọi vào downstream đang chết.

### 9.2 Async processing

- Đặt timeout cho job để tránh “treo vô hạn”.
- Giới hạn concurrency (bulkhead) để bảo vệ DB/third-party.

## 10) Idempotency: nền tảng để retry an toàn

### 10.1 Với API sync

- Client gửi `Idempotency-Key` cho request tạo side-effect (charge, create order).
- Server lưu kết quả theo key để nếu retry sẽ trả cùng kết quả.

### 10.2 Với consumer async

- Mỗi message có `messageId`.
- Consumer “dedupe” trước khi apply side-effect.

## 11) Testing và debugging

### 11.1 Sync

- Unit test logic.
- Integration test với DB/HTTP.

### 11.2 Async

- Test idempotency, retry, DLQ.
- Test outbox relay.
- Test eventual consistency (assert theo thời gian với timeout hợp lý).

### 11.3 Observability

- Metrics: latency (sync), queue depth/lag (async), job duration.
- Tracing: propagate `traceId` qua message.

## 12) So sánh nhanh (bảng quyết định)

| Tiêu chí    | Sync (request/response) | Async (job/event)     |
| ----------- | ----------------------- | --------------------- |
| UX          | Đơn giản                | Phức tạp hơn          |
| Latency     | Cần nhanh               | Chấp nhận trễ         |
| Timeout     | Dễ gặp                  | Ít hơn                |
| Coupling    | Cao                     | Thấp                  |
| Consistency | Thường mạnh             | Eventual              |
| Vận hành    | Dễ                      | Cần queue, retry, DLQ |

## 13) Anti-patterns (rất hay gặp)

- Nhồi tác vụ nặng vào API sync → timeout, user bấm lại tạo double
- Không có idempotency → retry gây hậu quả nặng
- Async nhưng không có “source of truth” để query trạng thái → UI mù
- Event-driven nhưng publish event không gắn với transaction (mất event)
- Dùng async để “che” performance issue thay vì tối ưu gốc (DB query chậm)

## 14) Checklist production

- Phân loại rõ tác vụ nào sync, tác vụ nào async (theo latency budget)
- Sync: timeout, retry policy, idempotency-key
- Async: job states, retry/backoff, DLQ, metrics/alerting
- Outbox nếu cần đảm bảo không mất event
- UX: status endpoint + (optional) realtime push
