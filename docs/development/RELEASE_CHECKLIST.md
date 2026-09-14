# Release Checklist

ขั้นตอน release ปัจจุบันอยู่ที่ [RELEASE_PROCESS.md](RELEASE_PROCESS.md) และรายละเอียด Windows packaging อยู่ที่ [PACKAGING_WINDOWS.md](PACKAGING_WINDOWS.md)

ตรวจสอบจากโฟลเดอร์ root:

```powershell
corepack pnpm@10.15.0 install --frozen-lockfile
corepack pnpm@10.15.0 lint
corepack pnpm@10.15.0 typecheck
corepack pnpm@10.15.0 test:release
corepack pnpm@10.15.0 docs:tools:check
corepack pnpm@10.15.0 test:packaging
```

ถ้าต้องสร้าง Windows artifacts ให้รัน `powershell -File scripts/package-windows.ps1` แล้วตรวจ `SHA256SUMS.txt`, `PROVENANCE.json`, installer, portable executable และการเริ่มใช้งานบน clean machine
