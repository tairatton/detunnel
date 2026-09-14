# DETUNNEL Capabilities

DETUNNEL เป็น local MCP gateway สำหรับให้ AI client ทำงานกับ workspace ที่ผู้ใช้อนุญาต โดยมี Desktop UI, HTTP transport และ STDIO transport

## ความสามารถหลัก

- ลงทะเบียนและเลือกหลาย workspace พร้อมตรวจขอบเขต path แบบ canonical
- อ่าน เขียน ค้นหา แก้ไข ย้าย คัดลอก ลบ และกู้คืนไฟล์ตาม policy
- ค้นหา source code, symbol, dependency และ context ของโปรเจกต์
- รัน process, shell, WSL, test, lint, typecheck และ build แบบมี timeout/ownership
- เชื่อมต่อ MCP server ภายนอกและ Codex ผ่าน permission/approval boundary แยกกัน
- รองรับ browser inspection, Windows automation, Office/media และ local PDF provider ตาม availability
- บันทึก activity, audit, live logs, backup, recovery และ scheduled continuation state
- ใช้งานจาก Desktop, local HTTP, STDIO และ Docker

## ขอบเขตความปลอดภัย

ทุก tool ผ่าน schema validation, workspace boundary, permission policy และการตรวจ risk ตามชนิดงาน งาน mutation ที่อาจทำให้ข้อมูลเสียหายต้องมี confirmation หรือ host approval ตามที่ policy กำหนด

`delete_file` ใช้ Recovery Trash และ checkpoint เมื่อทำได้ ส่วนคำสั่งหรือ provider ภายนอกจะไม่ถูกอ้างว่า recoverable หาก backend ไม่รองรับ Full Bypass เป็นการตั้งค่าระดับแอปและไม่ข้าม schema validation หรือข้อผิดพลาดของระบบปฏิบัติการ

รายละเอียด mutation boundary อยู่ที่ [MUTATION_SAFETY_MATRIX.md](architecture/MUTATION_SAFETY_MATRIX.md)

## MCP contract

รายการเครื่องมือและ schema แบบ generated อยู่ที่ [TOOL_CONTRACT.md](architecture/TOOL_CONTRACT.md) และจุดอ้างอิงแบบย่ออยู่ที่ [MCP_TOOL_CATALOG.md](mcp/MCP_TOOL_CATALOG.md)

ตรวจสอบ catalog ให้ตรงกับ registry:

```powershell
corepack pnpm@10.15.0 docs:tools:check
```

## Runtime channels

| Channel | ใช้สำหรับ |
| --- | --- |
| Desktop | ตั้งค่า policy, workspace, tunnel, logs และ recovery |
| HTTP | MCP client บนเครื่องเดียวกันผ่าน loopback |
| STDIO | MCP client ที่เรียก process โดยตรง |
| Docker | HTTP MCP gateway แบบแยก container |

## Verification

```powershell
corepack pnpm@10.15.0 lint
corepack pnpm@10.15.0 typecheck
corepack pnpm@10.15.0 test
corepack pnpm@10.15.0 test:integration
corepack pnpm@10.15.0 test:docker-paths
```
