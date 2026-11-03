# Thiết kế Graph (Neo4j)

## Vai trò
Chỉ làm một việc: lưu cây chủ đề và quan hệ tiên quyết để gợi ý ôn tập khi học sinh yếu một chủ đề.

## Nguyên tắc
1. PostgreSQL là nguồn dữ liệu gốc (bảng Topic, TopicPrerequisite). Graph chỉ là bản chiếu, mất thì dựng lại bằng `npm run graph:rebuild`.
2. RAG hỏi-đáp KHÔNG gọi graph. Graph tắt thì hỏi-đáp vẫn chạy.
3. Graph chỉ tham chiếu chunk đã publish; thu hồi thì gỡ liên kết. Lỗi graph chỉ ghi log.
4. Dữ liệu do giáo viên nhập tay, quy mô vài trăm nút, không dùng LLM trích xuất.
5. Bật/tắt bằng biến GRAPH_ENABLED.

## Mô hình nút và cạnh
- (:Subject) -[:GOM]-> (:Chapter) -[:GOM]-> (:Lesson) -[:GOM]-> (:Concept)
- (:Concept) -[:CAN_BIET_TRUOC]-> (:Concept)
- (:Concept) -[:CO_TRONG]-> (:Chunk {id})   // chỉ lưu ID

## Luồng gợi ý
Điểm quiz theo chủ đề (PostgreSQL) -> chủ đề yếu -> truy vấn tiên quyết (graph) -> gợi ý + chunk published.
