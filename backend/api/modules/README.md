# Modules 目錄

1. **用途**: 存放各業務子系統模組，實現業務邏輯隔離。
2. **每個模組目錄的責任**: 每個模組目錄 (BA, DP, SA 等) 負責自己專屬的 Model, Serializer, ViewSet, URL 註冊、報表與開窗邏輯。
3. **搬移順序**: B0 (骨架) -> B1 (Common) -> B2 (BA Low-Risk) -> B3 (BA Master-Detail) -> B4 (DP/SA/MR) -> B5 (高風險) -> B6 (SY) -> B7 (清理)。
4. **legacy endpoint 保留策略**: 搬移過程中，現有  中的 router () 必須保留，新模組的 URL 採用雙軌並存 ()。
5. **禁止直接跨模組 import 的規則**: 嚴禁 DP 模組的 views.py 直接 import BA 模組的 views.py。Models 之間的 Foreign Key 允許，但需注意順序。
6. **共用邏輯**: 如需跨模組共用邏輯或元件，應抽取至  之下，而非互相依賴。
