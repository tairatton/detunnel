# คู่มือการติดตั้งและใช้งาน DETUNNEL บน Docker

**DETUNNEL** คือ Local AI Agent Runtime และ MCP Gateway ที่รัน service ฝั่งเซิร์ฟเวอร์ใน Docker โดยแชร์เฉพาะโฟลเดอร์ `./workspace` และเก็บ state ใน Docker volume
การแยก container ช่วยลดผลกระทบต่อเครื่อง host แต่ไม่ใช่ sandbox สมบูรณ์แบบ และ MCP มีความสามารถอ่าน/เขียนไฟล์และรันคำสั่งได้

---

## 🌟 จุดเด่นเมื่อรันบน Docker
- **แยก runtime:** คำสั่งของ MCP ทำงานใน container ไม่ได้รันตรงบน Windows host
- **แยก workspace:** mount เฉพาะ `./workspace` และ volume สำหรับฐานข้อมูล/log/recovery
- **ค่าเริ่มต้นปลอดภัย:** `balanced`, Full Bypass ปิด และ bind พอร์ตที่ localhost ของ host
- **มี health check:** ตรวจสถานะผ่าน `/_detunnel/identity`

---

## 🚀 วิธีการเริ่มต้นใช้งาน (Quick Start)

### 1. ความต้องการของระบบ
* ติดตั้ง **Docker Desktop** บนเครื่องคอมพิวเตอร์ และเปิดโปรแกรม Docker ให้ทำงานอยู่

### 2. สั่งรันโปรแกรม
คุณสามารถเริ่มระบบได้ 2 วิธี:

* **วิธีที่ 1 (แนะนำ - ดับเบิลคลิก):**  
  ดับเบิลคลิกที่ไฟล์ **`docker/start.bat`** บน Windows

* **วิธีที่ 2 (ผ่าน Command Line):**  
  เปิด Terminal ในโฟลเดอร์นี้แล้วสั่ง:
  ```bash
  docker compose -f docker/compose.yml up -d --build
  ```

เมื่อรันสำเร็จ MCP Server จะเปิดให้บริการที่ `http://127.0.0.1:18765/mcp` โดยค่าเริ่มต้น
ถ้ากำหนด `DETUNNEL_PORT` ใน `.env` ให้ใช้พอร์ตนั้นแทน

---

## 🔗 วิธีเชื่อมต่อกับ ChatGPT Web (ผ่าน OpenAI Secure MCP Tunnel)

### รัน `tunnel-client` บนเครื่อง Host
1. ติดตั้ง OpenAI `tunnel-client` ตามปกติบนเครื่อง
2. คัดลอกไฟล์ `docker/detunnel.yaml` ไปไว้ที่:
   * **Windows:** `%APPDATA%\tunnel-client\detunnel.yaml`
3. แก้ไข `tunnel.id` ในไฟล์ให้ตรงกับ Tunnel ID ที่ได้จาก ChatGPT Web
4. รันคำสั่งสตาร์ท Tunnel:
   ```cmd
   tunnel-client run --config "%APPDATA%\tunnel-client\detunnel.yaml"
   ```
5. ใน ChatGPT Web เลือก connection ที่ผูกกับ tunnel แล้วเริ่มสั่งงาน

image นี้ไม่ bundle `tunnel-client` และไม่รับ API key ผ่าน container โดยตั้งใจ
ให้ tunnel เป็น process แยกบน host เพื่อลดการเก็บ credential ใน image

---

## 📁 การจัดการไฟล์งาน (Workspace Management)

* นำโฟลเดอร์โปรเจกต์ที่ต้องการให้ AI วิเคราะห์หรือแก้ไขมาไว้ที่ `./workspace/`
* ตรวจสอบสถานะก่อนใช้งาน:
  ```bash
  docker compose -f docker/compose.yml ps
  docker compose -f docker/compose.yml logs --tail=100 detunnel
  ```
* ตัวอย่างงานใน ChatGPT Web:
  > *"@detunnel ช่วยตรวจสอบไฟล์ script.py ใน workspace แล้วเขียน Unit test ด้วย pytest ให้หน่อย"*
  > *"@detunnel ตรวจสอบไฟล์ใน workspace"*

---

## 🛠️ คำสั่งที่มีประโยชน์สำหรับ Docker

* **ดู Log การทำงานแบบ Real-time:**
  ```bash
  docker compose -f docker/compose.yml logs -f
  ```
* **หยุดการทำงานของเซิร์ฟเวอร์:**
  ```bash
  docker compose -f docker/compose.yml down
  ```
* **Restart เซิร์ฟเวอร์:**
  ```bash
  docker compose -f docker/compose.yml restart
  ```
* **เข้าไปดูไฟล์ใน Container ผ่าน Bash:**
  ```bash
  docker compose -f docker/compose.yml exec detunnel bash
  ```

## การตั้งค่าความปลอดภัย

ค่าใน `docker/.env.example` ปิด Full Bypass และ unrestricted mode ไว้ หากเปิด
สองค่านี้ AI จะข้าม approval/scope ของ application หลายชั้น ควรเปิดเฉพาะ
deployment ที่แยกเครื่องหรือควบคุม client ได้จริง และไม่ควรเปลี่ยน port binding
จาก `127.0.0.1` เป็นทุก interface โดยไม่ตั้ง authentication/firewall เพิ่ม

`./workspace` เป็น bind mount ดังนั้นการแก้ไขหรือลบไฟล์ใน container จะเปลี่ยน
ไฟล์บน host โดยตรง ควรสำรองข้อมูลก่อนเชื่อมต่อ MCP client ที่ไม่คุ้นเคย

checkpoint encryption key ถูกเก็บใน volume `detunnel-data` แยกจาก workspace
และจำกัด permission เป็น owner-only บน Linux หากต้องการกำหนดคีย์เอง ให้ส่ง
`DETUNNEL_CHECKPOINT_KEY_BASE64` เป็นค่า Base64 ขนาด 32 ไบต์ผ่าน environment

---

## ⚙️ โครงสร้างไฟล์ที่สำคัญ

```
detunnel/
├── docker/
│   ├── Dockerfile              # โครงสร้าง Container (Node.js 24 + Tools)
│   ├── ../.dockerignore         # ลดขนาด Docker build context
│   ├── compose.yml             # คอนฟิกการรันเซอร์วิส Docker
│   ├── start.bat               # ตัวรัน 1-click สำหรับ Windows
│   ├── start.sh                # ตัวรันสำหรับ Linux / macOS
│   ├── entrypoint.sh           # Container entrypoint แบบไม่แก้ workspace อัตโนมัติ
│   ├── detunnel.yaml           # คอนฟิกโปรไฟล์สำหรับ OpenAI Secure Tunnel
│   └── .env.example            # แม่แบบตัวแปรสภาพแวดล้อม
├── workspace/                  # โฟลเดอร์ที่แชร์กับ AI (วางโค้ดที่นี่)
└── packages/ & apps/           # ซอร์สโค้ดระบบ DETUNNEL MCP
```
