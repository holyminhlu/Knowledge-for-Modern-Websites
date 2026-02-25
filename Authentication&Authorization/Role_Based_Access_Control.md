# Role-Based Access Control (RBAC) - Kiểm soát truy cập dựa trên vai trò

## 1. Khái niệm (What is RBAC?)
**Role-Based Access Control (RBAC)** là một phương pháp quản lý quyền truy cập cực kỳ phổ biến trong các hệ thống phần mềm và mạng doanh nghiệp. Thay vì cấp quyền trực tiếp lẻ tẻ cho từng cá nhân người dùng (User), hệ thống sẽ gán quyền (Permissions) cho các "Vai trò" (Roles) cụ thể. Sau đó, người dùng sẽ được gán vào các vai trò đó để kế thừa những quyền tương ứng.

Ví dụ: Bạn đi làm ở công ty, thay vì bảo vệ và IT phải nhớ cấp cho nhân viên Nguyễn Văn A từng thẻ mở cửa phòng Server, thẻ kho, quyền xem mã nguồn, quyền sửa doanh thu... Họ chỉ việc gán Nguyễn Văn A vào chức vụ (Role) là `Kế Toán` hoặc `Lập trình viên`. Mọi quyền lợi đã được quy định sẵn trong chức vụ đó.

## 2. Các thành phần cốt lõi của RBAC
Mô hình RBAC chuẩn (như NIST RBAC) bao gồm 3 thực thể chính kết nối với nhau:

1. **User (Người dùng):** Thực thể con người hoặc hệ thống tự động đăng nhập vào ứng dụng (VD: `John`, `Admin_01`).
2. **Role (Vai trò):** Một nhóm logic định nghĩa chức năng công việc hoặc thẩm quyền (VD: `Admin`, `Editor`, `Viewer`, `Manager`).
3. **Permission / Privilege (Quyền hạn):** Những hành động được phép thực hiện trên các tài nguyên cụ thể (VD: `read:article`, `write:article`, `delete:article`, `view:financial_report`).

### Mối quan hệ giữa các thành phần (Chìa khóa của RBAC)
- **Many-to-Many giữa (Role) và (Permission):** Một Role có thể chứa nhiều Permission (Role `Editor` có quyền `read` và `write`). Và ngược lại, một Permission có thể thuộc về nhiều Role khác nhau (Quyền `read` nằm ở cả Role `Viewer` lẫn `Editor`).
- **Many-to-Many giữa (User) và (Role):** Một User có thể kiêm nhiệm nhiều Role cùng lúc (VD: Ông sếp vừa là `Manager` vừa là `Admin`). Một Role sẽ có nhiều User cùng chung quyền hạn. 

*(Tuyệt đối không có mối quan hệ trực tiếp kết nối từ User thẳng đến Permission trong thiết kế Database của RBAC thuần túy).*

## 3. Ưu điểm của RBAC
- **Dễ dàng quản lý ở quy mô lớn:** Khi công ty có hàng nghìn nhân viên, việc nhân sự mới vào làm (Onboarding) hay nghỉ việc (Offboarding) chỉ tốn vài cú click dán nhãn / gỡ nhãn Role là xong, không phải đi thu hồi hay cấp lẻ từng quyền một.
- **Tuân thủ Principle of Least Privilege (Quyền hạn tối thiểu):** Giúp tổ chức giới hạn chặt chẽ quyền, không ai có quyền vượt quá vai trò công việc của mình. Tránh việc một User bị tích tụ quyền (permission creep) theo thời gian dài làm việc.
- **Tính trích xuất và Audit (Kiểm tra) dễ dàng:** Rất dễ trả lời các tiêu chuẩn bảo mật ISO hoặc SOC2 khi thanh tra hỏi "Những ai trong công ty đang có quyền Xóa database?". Chỉ cần tra xem Role nào chứa quyền Xóa Database và liệt kê danh sách Users trong Role đó.

## 4. Thiết kế Database cơ bản cho RBAC (Relational DB)
Cần ít nhất 5 bảng (Tables) để thực hiện RBAC tiêu chuẩn:

1. **`users`** (id, username, password...)
2. **`roles`** (id, role_name, description)
3. **`permissions`** (id, permission_name, resource)
4. **`user_roles`** (user_id, role_id) -> Bảng trung gian (Pivot table)
5. **`role_permissions`** (role_id, permission_id) -> Bảng trung gian (Pivot table)

## 5. Phân loại các cấp độ RBAC
- **Core RBAC:** Phiên bản cơ bản truyền thống (như mô tả ở trên).
- **Hierarchical RBAC (RBAC Phân cấp):** Các Role có tính kế thừa nhau theo mô hình cây. Ví dụ: Role `Senior Admin` sẽ tự động kế thừa (bao trùm) mọi quyền của Role `Junior Admin` mà không cần gán lại bảng ánh xạ.
- **Constrained RBAC (RBAC Ràng buộc):** Bổ sung khái niệm Seperation of Duties (Phân tách Trách nhiệm). Ngăn chặn một User độc chiếm các Role gây xung đột lợi ích (VD: Một người không thể vừa giữ Role `Người duyệt chi tiền` vừa giữ Role `Người đề xuất chi tiền` trong cùng 1 phiên làm việc để chống gian lận).

## 6. Nhược điểm và Sự giới hạn (Khi nào không nên dùng RBAC?)
Từ những năm gầy đây, khi logic doanh nghiệp phức tạp hơn, RBAC bắt đầu bộc lộ điểm yếu: **Hiện tượng "Bùng nổ Role" (Role Explosion).**
Ví dụ: Bạn muốn cấp quyền: "Người dùng có Role là Manager chỉ được phép Sửa bài viết, **NHƯNG** chỉ được sửa vào giờ hành chính, và chỉ sửa bài do chính họ tạo ra ở chi nhánh Hà Nội". 

RBAC thuần túy sẽ bất lực vì nó chỉ trả lời được câu hỏi "Mày là Ai?" (Role) chứ không quan tâm đến "Ngữ cảnh / Trạng thái xung quanh là gì?". 
Nếu ráng dùng RBAC, người ta sẽ phải đẻ ra hàng trăm Role dị dạng như: `Manager_Hanoi_Day_SelfEdit`, `Manager_HCM_Night_SelfEdit`... dẫn đến rác hệ thống.

👉 **Giải pháp thay thế/nâng cấp:** Khi gặp tình huống kịch bản ngữ cảnh (Context-aware) phức tạp nêu trên, các hệ thống lớn (AWS IAM, Kubernetes) sẽ dịch chuyển sang dùng mô hình **ABAC (Attribute-Based Access Control)** hoặc **PBAC (Policy-Based Access Control)** để bổ sung các luồng if/else biến số linh hoạt hơn dựa trên thuộc tính của tài nguyên, môi trường thay vì chỉ dựa vào "tên chức vụ" cứng nhắc.
