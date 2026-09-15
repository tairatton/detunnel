# DETUNNEL

DETUNNEL เป็น local MCP gateway สำหรับเชื่อม AI client เข้ากับ workspace บนเครื่อง โดยมี Desktop UI, HTTP transport และ STDIO transport

## Desktop focus mode

เส้นทางหลักของ Desktop UI คือการเชื่อม ChatGPT กับคอมเครื่องนี้ แล้วเลือกโปรเจกต์ที่อนุญาตให้ ChatGPT ใช้งานผ่าน MCP โดย detunnel ไม่เรียก OpenAI API สำหรับตัวโมเดลและไม่ต้องใช้ OpenAI API key ใน flow นี้ การใช้โมเดลยังขึ้นกับบัญชีและขีดจำกัดของ ChatGPT ที่ผู้ใช้ล็อกอินอยู่

หน้า Desktop ใช้ Home เป็นหน้าหลักเพียงหน้าเดียว โดยเปิด Settings เป็นแผงด้านข้างจากไอคอนบนแถบหัวโปรแกรม ส่วน Tools, Work Log, Live Logs, Doctor, External MCP และ Secure MCP Tunnel แบบเดิมยังคงอยู่ในโค้ดเพื่อ compatibility/recovery แต่ไม่ใช่เส้นทางเริ่มต้นของผลิตภัณฑ์

## ความสามารถหลัก

- จัดการ workspace และไฟล์ภายใต้ขอบเขตที่กำหนด
- ค้นหาโค้ดและบริบทของโปรเจกต์
- รัน process, test, lint, typecheck และ build
- เชื่อมต่อ MCP server ภายนอก
- บันทึก activity log, audit และ recovery checkpoint
- ใช้งานผ่าน Desktop, HTTP หรือ STDIO
- รองรับ Docker สำหรับ HTTP MCP gateway

## ความต้องการระบบ

- Node.js 24
- pnpm 10.15.0 ผ่าน Corepack
- Python 3.10+ สำหรับ launcher ของ Desktop App
- Windows 10/11 สำหรับ Desktop application
- Docker Desktop สำหรับการใช้งานแบบ container

## ติดตั้ง dependency

```powershell
corepack enable
corepack pnpm@10.15.0 install --frozen-lockfile
```

## Build และเริ่มใช้งาน

```powershell
corepack pnpm@10.15.0 build:server
corepack pnpm@10.15.0 start
```

HTTP endpoint เริ่มต้นคือ `http://127.0.0.1:18765/mcp`

STDIO transport:

```powershell
corepack pnpm@10.15.0 detunnel:stdio
```

Desktop application:

```powershell
python main.py
```

`main.py` จะอ่านค่าเสริมจาก `.env` ที่ root หากมี โดยค่าที่ตั้งผ่านระบบหรือ PowerShell จะมีสิทธิ์สูงกว่าไฟล์

ถ้าต้องการ build ใหม่ก่อนเปิดแอป:

```powershell
python main.py --build
```

## Docker

```powershell
docker compose -f docker/compose.yml up -d --build
```

หรือใช้ `docker\start.bat` บน Windows และ `./docker/start.sh` บน Linux/macOS รายละเอียดเพิ่มเติมอยู่ที่ `docs/DOCKER_GUIDE.md`

## Environment

สำหรับ Desktop ให้กำหนดตัวแปร `DETUNNEL_*` ผ่าน environment ของระบบหรือ PowerShell ก่อนรัน `python main.py` ส่วน Docker ใช้ `docker/.env.example` เป็นแม่แบบสำหรับ container

ค่าหลักได้แก่ `DETUNNEL_HOST`, `DETUNNEL_PORT`, `DETUNNEL_WORKSPACE`, `DETUNNEL_DATA_PATH`, `DETUNNEL_PROFILE`, `DETUNNEL_FULL_BYPASS`, `DETUNNEL_UNRESTRICTED` และ `DETUNNEL_DISABLE_BROWSER_AUTOMATION` (ตั้งเป็น `1` เพื่อปิด Browser/CDP และ desktop UI automation โดยยังใช้ MCP/file editing ได้)

ค่าเริ่มต้นของ Docker จำกัดการฟังไว้ที่ localhost และปิด unrestricted/full bypass

### Session resilience /

Local MCP ใช้ loopback endpoint ที่เลือกตามสภาพแวดล้อมและตรวจสอบ readiness ก่อนเริ่มงาน ส่วนงานที่ใช้เวลานานควรเรียกผ่าน durable process/task แล้วติดตามผลด้วย status/result จนจบ การเริ่มใหม่ต้องตรวจ ownership และคืนสถานะอย่างปลอดภัยโดยไม่เดา port หรือ workspace

สำหรับการตรวจ tunnel บน Windows ใช้ executable ที่ตั้งค่าไว้หรือ bundled runtime แล้วรันคำสั่งตรวจสอบโดยไม่ hard-code listener port:

```powershell
$tc = if ($env:DETUNNEL_TUNNEL_CLIENT_PATH) { $env:DETUNNEL_TUNNEL_CLIENT_PATH } else { 'resources\tunnel-client\tunnel-client.exe' }
& $tc doctor --profile lnwjud --profile-dir $profile --explain
```

## Security and operational model

MCP transport, workspace boundary, permission policy, host approval, activity log และ recovery ทำงานเป็นชั้นแยกกัน ทุก mutation ต้องผ่าน validation และไม่เปิดเผย secret ใน response หรือ log

## ตรวจสอบคุณภาพ

```powershell
corepack pnpm@10.15.0 lint
corepack pnpm@10.15.0 typecheck
corepack pnpm@10.15.0 test
corepack pnpm@10.15.0 test:integration
corepack pnpm@10.15.0 test:docker-paths
```

## โครงสร้าง

```text
apps/         CLI และ Desktop application
assets/       ไฟล์ประกอบของโปรแกรม
docker/       Container configuration และ launcher
docs/         เอกสารการใช้งานและสถาปัตยกรรม
native/       Native Windows components
packages/     Core packages ของระบบ
recipes/      Workflow recipes
scripts/      Build และ maintenance scripts
tests/        Integration และ packaging tests
workspace/    พื้นที่ mount เริ่มต้นสำหรับ Docker
```

## License

ดูรายละเอียดใน `LICENSE` ซึ่งต้องคงไว้พร้อมโปรแกรมตามเงื่อนไขของซอฟต์แวร์ต้นทาง
