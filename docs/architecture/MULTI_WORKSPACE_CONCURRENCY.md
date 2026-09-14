# Multi-workspace Concurrency

ระบบรองรับหลาย workspace ที่ active พร้อมกัน โดยทุก request, process, activity และ recovery item ต้องมี workspace scope ที่ตรวจสอบได้

## Ownership rules

- workspace ต้องลงทะเบียนก่อนใช้งานและต้องอยู่ใน Active Project Set
- request ที่ใช้ absolute path จะ route ไปยัง workspace ที่ตรงแบบ specific ที่สุด
- session หนึ่งไม่สามารถอ่านหรือแก้ process ของ session อื่นโดยไม่มี ownership proof
- process และ background task เก็บ `workspaceId` กับ `sessionId` เพื่อป้องกันข้อมูลปะปน
- clear log หรือ work log ทำได้เฉพาะ scope ที่ระบุ และไม่ลบข้อมูลของ workspace อื่น

## Mutation rules

การเขียน/ลบไฟล์และการรัน process ผ่าน registry boundary เดียวกัน จึงตรวจ active workspace, canonical path, permission, approval และ concurrency fence ตามลำดับ งานข้าม workspace ที่ target ไม่ตรงกับ request จะถูกปฏิเสธหรือ route อย่างชัดเจน ไม่เดา workspace ให้แบบเงียบ ๆ

## Verification

การเปลี่ยนแปลงด้าน concurrency ต้องครอบคลุม unit, integration และ acceptance test ของสอง workspace พร้อมตรวจ activity/log isolation และ cleanup ของ process ทุกตัว
