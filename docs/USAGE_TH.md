# คู่มือการใช้งาน DETUNNEL

DETUNNEL เป็น local MCP gateway สำหรับให้ ChatGPT, Codex และ MCP client ทำงานกับ workspace บนเครื่อง โดยมี Desktop UI, HTTP และ STDIO transport

## ติดตั้ง

ต้องมี Node.js 24 และ pnpm 10.15.0 ผ่าน Corepack

```powershell
corepack enable
corepack pnpm@10.15.0 install --frozen-lockfile
corepack pnpm@10.15.0 build:server
```

## เริ่มใช้งาน

HTTP:

```powershell
corepack pnpm@10.15.0 start
```

ค่าเริ่มต้นคือ `http://127.0.0.1:18765/mcp`

STDIO:

```powershell
corepack pnpm@10.15.0 detunnel:stdio
```

Desktop:

```powershell
corepack pnpm@10.15.0 desktop
```

Docker:

```powershell
docker compose -f docker/compose.yml up -d --build
```

## Environment

สำหรับ Desktop ให้กำหนดตัวแปร `DETUNNEL_*` ผ่าน environment ของระบบหรือ PowerShell หรือสร้างไฟล์ `.env` ที่ root ก่อนรัน `python main.py` โดยค่าจากระบบ/PowerShell จะมีสิทธิ์สูงกว่าไฟล์ ส่วน Docker ใช้ `docker/.env.example` เป็นแม่แบบ แล้วกำหนดค่าที่จำเป็น เช่น `DETUNNEL_HOST`, `DETUNNEL_PORT`, `DETUNNEL_WORKSPACE`, `DETUNNEL_DATA_PATH`, `DETUNNEL_PROFILE` และ `DETUNNEL_FULL_BYPASS`

ค่าเริ่มต้นของ Docker จำกัดการฟังไว้ที่ localhost และปิด unrestricted/full bypass

## Workflow ที่แนะนำ

1. เปิด Desktop และตรวจ Doctor ให้ผ่าน
2. เพิ่ม workspace ผ่านหน้า Projects
3. ตรวจ permission profile และ Active Project
4. ใช้เครื่องมืออ่าน/ค้นหาก่อนเริ่ม mutation
5. ตรวจผลลัพธ์จาก activity log, audit และ recovery center

## ขอบเขตเครื่องมือ

- workspace และไฟล์: ตรวจ path แบบ canonical และจำกัด workspace ที่ลงทะเบียน
- search และ context: ค้น source, symbol, dependency และ test context แบบมีขอบเขต
- process และ project: รัน command, test, lint, typecheck และ build โดยมี timeout
- browser/Windows/Office/media/PDF: เปิดใช้ตาม platform และ provider readiness
- external MCP/Codex: ผ่าน permission และ host approval แยกจาก local tools

## ความปลอดภัย

อย่าเก็บ API key หรือ secret ใน source, log, activity หรือไฟล์ที่แชร์ ใช้ `.env` เฉพาะบนเครื่องและตรวจสถานะ permission ก่อนอนุญาต mutation

รายละเอียดอยู่ที่ [MUTATION_SAFETY_MATRIX.md](architecture/MUTATION_SAFETY_MATRIX.md), [TOOL_CONTRACT.md](architecture/TOOL_CONTRACT.md) และ [DOCKER_GUIDE.md](DOCKER_GUIDE.md)

## ตรวจสอบคุณภาพ

```powershell
corepack pnpm@10.15.0 lint
corepack pnpm@10.15.0 typecheck
corepack pnpm@10.15.0 test
corepack pnpm@10.15.0 test:integration
corepack pnpm@10.15.0 test:docker-paths
corepack pnpm@10.15.0 docs:tools:check
```
