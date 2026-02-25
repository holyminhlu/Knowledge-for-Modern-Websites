# SOLID Principles

SOLID là một bộ 5 nguyên lý thiết kế hướng đối tượng (Object-Oriented Design) nổi tiếng, được giới thiệu bởi Robert C. Martin (Uncle Bob). Mục tiêu của các nguyên lý này là giúp các lập trình viên viết ra những đoạn code dễ đọc, dễ mở rộng, dễ bảo trì và hạn chế tối đa lỗi khi hệ thống phần mềm phình to.

Dưới đây là chi tiết về 5 chữ cái biểu đại diện cho 5 nguyên lý trong SOLID.

---

## 1. S - Single Responsibility Principle (SRP) - Nguyên lý Đơn Trách Nhiệm

> **"Một class (hoặc module/function) chỉ nên có một và chỉ một lý do để thay đổi."**

**Giải thích:**
Mỗi một class chỉ nên chịu trách nhiệm duy nhất cho một phần chức năng (logic) cụ thể của phần mềm. Nếu một class đảm nhận quá nhiều việc, khi bạn thay đổi một chức năng nhỏ nào đó, nó có thể ảnh hưởng gián tiếp đến những phần chức năng khác trong cùng class, dẫn đến lỗi dây chuyền (bug regression).

**Ví dụ (Vi phạm SRP):**
Một class `User` vừa giữ thông tin người dùng, vừa có logic tính lương, vừa có logic lưu ID người dùng vào cơ sở dữ liệu (Database).
```typescript
class User {
    private name: string;
    
    // Trách nhiệm 1: Quản lý thông tin user
    getName() { return this.name; }
    
    // Trách nhiệm 2: Liên quan đến DB (Xấu)
    saveUserToDatabase() { /* logic kết nối MySQL, SQL Server */ }
    
    // Trách nhiệm 3: Logic nghiệp vụ chung (Xấu)
    calculateSalary() { /* logic tính lương */ }
}
```

**Cách khắc phục (Tuân thủ SRP):**
Tách nó ra làm 3 class riêng biệt:
- `User`: Chỉ chứa Properties.
- `UserRepository`: Chỉ xử lý lấy dứ liệu và lưu vào database.
- `PayrollService`: Chỉ tính lương công ty.

---

## 2. O - Open/Closed Principle (OCP) - Nguyên lý Đóng/Mở

> **"Các thực thể phần mềm (classes, modules, functions...) nên MỞ để mở rộng (Open for extension), nhưng ĐÓNG để sửa đổi (Closed for modification)."**

**Giải thích:**
Khi bạn muốn thêm một tính năng mới cho chương trình, bạn nên mở rộng (viết thêm code mới, class mới) thay vì phải đi mổ xẻ và sửa lại những đoạn code cũ đang chạy ổn định. Sửa lại code cũ cực kỳ dễ tạo ra lỗi.

**Ví dụ:**
Giả sử bạn có class tính diện tích:
```typescript
// VI PHẠM OCP
class AreaCalculator {
    calculate(shape: any) {
        if (shape.type === 'circle') return Math.PI * shape.radius * shape.radius;
        if (shape.type === 'square') return shape.length * shape.length;
        // Nếu thêm hình Tam giác mới, bạn PHẢI sửa trực tiếp file này (Closed modification bị vỡ)
    }
}
```

**Cách khắc phục (Tuân thủ OCP):** Sử dụng Kế thừa (Inheritance) hoặc Interface đa hình (Polymorphism).
```typescript
interface Shape {
    calculateArea(): number;
}

class Circle implements Shape {
    constructor(private radius: number) {}
    calculateArea() { return Math.PI * this.radius * this.radius; }
}

class Square implements Shape { ... }
class Rectangle implements Shape { ... } // Thoải mái thêm hình mới mà AreaCalculator không quan tâm

class AreaCalculator {
    calculate(shape: Shape) {
        return shape.calculateArea(); // Không cần biết đây là hình gì! Nó tự gọi đúng.
    }
}
```

---

## 3. L - Liskov Substitution Principle (LSP) - Nguyên lý Thay thế Liskov

> **"Các đối tượng (objects) của các lớp cha (superclasses) phải có khả năng được thay thế bằng các đối tượng của các lớp con (subclasses) mà không làm hỏng tính đúng đắn của chương trình."**

**Giải thích:**
Khi bạn kế thừa một class, class con phải KẾ THỪA đúng bản chất tĩnh/chức năng của lớp cha, không được vứt bỏ hoặc bóp méo hành vi mặc định của lớp cha để làm ứng dụng báo lỗi ném Exception nếu ai đó gọi phương thức của cha. Nếu class con không thể thực hiện hành động của cha, thì nó **KHÔNG NÊN** kế thừa.

**Ví dụ kinh điển (Vi phạm LSP): Chim Cánh Cụt biết bay?**
```typescript
class Bird {
    fly() { console.log("I am flying"); }
}

class Eagle extends Bird { ... }

// Pengiun KẾ THỪA Bird, nhưng Penguin KHÔNG BIẾT BAY!
class Penguin extends Bird {
    fly() { 
        throw new Error("Penguins cannot fly!"); // Bóp méo chức năng mặc định của cha, làm ứng dụng chết.
    }
}
```

**Cách khắc phục:** 
Tách Interface ra. Ví dụ tạo class gốc `Bird`. Các class bay được thì implement giao diện `Flyable`.

---

## 4. I - Interface Segregation Principle (ISP) - Nguyên lý Phân tách Interface

> **"Nhiều Interface cụ thể dành cho từng Client tốt hơn là một Interface làm mọi thứ (General-purpose Interface). Không nên ép các class cài đặt những phương thức mà nó không sử dụng."**

**Giải thích:**
Tránh tạo ra một Interface (Hợp đồng) quá khổng lồ mập mạp nhét đủ mọi hàm thập cẩm. Khi đó các class kế thừa (implement) nó sẽ phải lấy cả những phương thức ngớ ngẩn thừa thãi mà chúng chẳng bao giờ dùng tới làm rác và vỡ kiến trúc code.

**Ví dụ (Vi phạm ISP):**
```typescript
// Interface quá to
interface Worker {
    work(): void;
    eat(): void;
    sleep(): void;
}

class HumanWorker implements Worker {
    work() { console.log("Working"); }
    eat() { console.log("Eating"); }
    sleep() { console.log("Sleeping"); }
}

// Robot không ăn không ngủ! Nhưng lại bị ÉP phải Override hàm đó do implement Worker Interface.
class RobotWorker implements Worker {
    work() { console.log("Working forever"); }
    eat() { throw new Error("Robots don't eat"); } // Bị rác
    sleep() { throw new Error("Robots don't sleep"); } // Bị rác
}
```

**Cách khắc phục (Tuân thủ ISP):** Chia nhỏ Interface.
```typescript
interface Workable { work(): void; }
interface Feedable { eat(): void; }
interface Sleepable { sleep(): void; }

class HumanWorker implements Workable, Feedable, Sleepable { ... }
class RobotWorker implements Workable { ... } // Chỉ bắt buộc code logic làm việc. Rất Clean!
```

---

## 5. D - Dependency Inversion Principle (DIP) - Nguyên lý Đảo ngược Phụ thuộc

> **"1. Các module cấp cao (High-level) không nên phụ thuộc vào các module cấp thấp (Low-level). Cả hai nên phụ thuộc vào Interface (hoặc lớp trừu tượng - Abstractions).**
> **2. Abstractions (Lớp trừu tượng) không nên phụ thuộc vào Implementation (chi tiết triển khai). Mà Implementation phải phụ thuộc vào Abstractions."**

*(Đừng nhầm lẫn DIP - một Dependency Inversion Principle trong cấu trúc với DI - Dependency Injection là một Pattern).*

**Giải thích:**
Class chứa logic nghiệp vụ cốt lõi không nên khởi tạo thẳng (khai báo `new MySQLDatabase()`) các class chứa kiến trúc lặt vặt. Khi dự án đổi DB sang Oracle/MongoDB, bạn sẽ phải vào tận class cấu hình ở module cao để sửa. Khi đó bạn nên truyền vào tham số ở dưới dạng một `Interface` chung chung. 

**Ví dụ (Vi phạm DIP):**
```typescript
class MySQLConnection {
    connect() { console.log("Connecting to MySQL..."); }
}

class UserService {
    private db: MySQLConnection; // Module cấp cao UserService MẮC KẸT CỨNG với module cấp thấp MySQL.
    
    constructor() {
        this.db = new MySQLConnection(); // Hard Code. Xấu. Khác gì tự khóa tay mình.
    }
}
```

**Cách khắc phục (Tuân thủ DIP):** 
```typescript
// 1. Tạo Abstraction Interface chung (Cả High-level và Low-level đều dựa vào đây)
interface DatabaseConnection {
    connect(): void;
}

// 2. Các Implementation cụ thể sẽ chịu trách nhiệm kế thừa Interace trên
class MySQLConnection implements DatabaseConnection { ... }
class MongoDBConnection implements DatabaseConnection { ... }

// 3. Module cấp cao (UserService) chỉ phụ thuộc vào Interface
class UserService {
    private db: DatabaseConnection; 

    // Bơm qua Constructor (Dependency Injection kết hợp)
    constructor(dbConnection: DatabaseConnection) {
        this.db = dbConnection;
    }
}

// Khi lập trình, bạn thoải mái cấu hình truyền vào bất kì Object DB nào, DB Oracle hay TestMocking DB đều dùng chung trên UserService cũ mà không hỏng.
const app = new UserService(new MongoDBConnection()); 
```

---
**Tổng kết:** Dù có tên gọi khá hàn lâm, 5 nguyên lý phân định trách nhiệm code của SOLID là cực kỳ quan trọng ở các mốc dự án Enterprise, giúp giảm gánh nặng Tech Debt (nợ kỹ thuật) và giữ cho các lập trình viên một trạng thái "Code dễ đọc, nhắm mắt nâng cấp mà không sợ sập server".
