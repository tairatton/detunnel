# Runtime Architecture

DETUNNEL แบ่งระบบเป็น workspace/domain services, application services, MCP registry และ Desktop/CLI adapters โดยแต่ละชั้นมี boundary ชัดเจนและส่งข้อมูลเป็น structured result

## หลักการ

- filesystem, search และ process operations อยู่ใน package ที่รับผิดชอบโดยตรง
- application layer รวม workspace, file, search, process, project, Codex และ diagnostics services
- MCP registry เป็นจุดกลางสำหรับ schema, availability, permission, approval, activity และ dispatch
- Desktop และ CLI เป็น adapters ที่ใช้ contract เดียวกัน ไม่คัดลอก business logic
- งานที่อ่านได้ต้อง bounded และงานที่เปลี่ยนข้อมูลต้องตรวจ canonical path, ownership และ risk ก่อน dispatch
- runtime state ที่ต้องข้าม process ใช้ storage service และ atomic persistence

## Request flow

```text
MCP client
  -> transport (HTTP/STDIO)
  -> ToolRegistry
  -> schema + availability + permission + approval
  -> application/capability service
  -> structured result + activity/audit
```

## Workspace boundary

Primary Project เป็นค่าเริ่มต้นเท่านั้น ทุก request ที่ระบุ workspace หรือ absolute target ต้อง resolve ไปยัง workspace ที่ลงทะเบียนและ active อยู่ หากอยู่นอกขอบเขตให้ fail closed

## Context และ indexing

Search/context services จำกัด depth, result count, bytes และเวลา พร้อม cache/index ที่ invalidation ได้ การ index จะข้ามโฟลเดอร์หนักและ metadata ภายใน workspace เพื่อไม่ให้เกิด I/O หรือข้อมูลรั่วโดยไม่จำเป็น

## Runtime contract

รายการ tool และ schema ที่ generated จาก registry อยู่ที่ [TOOL_CONTRACT.md](TOOL_CONTRACT.md) ตรวจความสอดคล้องด้วย `pnpm docs:tools:check` ก่อน release
