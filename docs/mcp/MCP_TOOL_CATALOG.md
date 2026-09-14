# MCP Tool Catalog

รายการเครื่องมือ MCP ปัจจุบันสร้างจาก `ToolRegistry` โดยอัตโนมัติ ไม่เก็บสำเนารายการเครื่องมือเก่าไว้ในเอกสารนี้

ดูรายละเอียด contract และรายการเครื่องมือที่ตรวจสอบแล้วได้ที่ [TOOL_CONTRACT.md](../architecture/TOOL_CONTRACT.md)

ตรวจสอบว่าเอกสารตรงกับ registry:

```powershell
corepack pnpm@10.15.0 docs:tools:check
```

เอกสารนี้เป็นจุดอ้างอิงสำหรับผู้ใช้ ส่วน schema และ implementation จริงอยู่ใน `packages/mcp-server/src/tools/` และ `packages/mcp-server/src/tool-registry.ts`
