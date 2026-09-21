# Mutation Safety Matrix

เอกสารนี้สรุปขอบเขตความปลอดภัยของ mutation ที่มีอยู่ในระบบปัจจุบัน รายการเครื่องมือแบบ canonical อยู่ใน [TOOL_CONTRACT.md](TOOL_CONTRACT.md)

## หลักการร่วม

- schema และ path validation ทำงานก่อน dispatch ทุกครั้ง
- workspace ที่ใช้งานต้องเป็น workspace ที่ลงทะเบียนและอยู่ใน Active Project Set
- งานเขียน ลบ แทนที่ และคำสั่งที่อาจทำให้ข้อมูลเสียหายต้องผ่าน permission policy และ host approval ตามความเสี่ยง
- Full Bypass ข้ามเฉพาะ approval/scope ของแอปตามการตั้งค่า แต่ไม่ข้าม schema validation, provider failure, OS permission, lock หรือข้อจำกัดของ backend
- `delete_file` ใช้ Recovery Trash และ checkpoint ตามนโยบายของระบบ ส่วนคำสั่งภายนอกจะไม่ถูกอ้างว่า recoverable หาก backend ไม่รองรับ
- งานที่อยู่นอก workspace หรือระบุ target ไม่ชัดเจนจะไม่ถูก auto-approve

## กลุ่ม mutation

| กลุ่ม | ตัวอย่าง | การป้องกัน |
| --- | --- | --- |
| File mutation | `write_file`, `apply_patch`, `move_file`, `copy_file`, `delete_file` | canonical path, secret guard, checkpoint, confirmation และ recovery |
| Process/command | `process_start`, `process_stop`, `shell`, `wsl_exec` | executable policy, cwd boundary, risk inspection, timeout และ host approval |
| Project/runtime | `project_dev`, `project_test`, `project_lint`, `project_typecheck`, `project_build` | active workspace, process ownership และ bounded execution |
| External integration | `mcp_call`, Codex และ document/media mutation | opaque risk classification, independent host approval และ provider boundary |
| Recovery/settings | restore, backup, profile และ scheduled continuation tools | exact identity, ownership, lease/fence และ persistence validation |

## การตรวจสอบ

```powershell
corepack pnpm@10.15.0 typecheck
corepack pnpm@10.15.0 --filter @detunnel/mcp-server test
corepack pnpm@10.15.0 docs:tools:check
```

การเปลี่ยน contract ต้องเพิ่ม schema/registry test, permission และ annotation assertions, success/failure tests และอัปเดต generated tool contract ให้ตรงกับ registry
