# Current Architecture Status

เอกสารนี้แทน roadmap แบบ phase เก่าที่ไม่ตรงกับ source ปัจจุบัน และเก็บเฉพาะสถานะที่ตรวจสอบได้จาก code/test

| Area | Status | Source of truth |
| --- | --- | --- |
| Workspace/file boundary | Ready | `packages/application`, `packages/filesystem`, `packages/workspace` |
| Search/context/index | Ready | `packages/search`, `packages/application` |
| Process/project execution | Ready | `packages/process`, `packages/capabilities`, `packages/project` |
| MCP transport and registry | Ready | `packages/mcp-server` |
| Desktop/CLI adapters | Ready | `apps/desktop`, `apps/cli` |
| Docker packaging | Ready | `docker/`, `tests/packaging/docker-layout.test.ts` |
| Recovery and audit | Ready | `packages/audit`, `packages/storage`, `packages/application` |
| Optional platform providers | Dependency-gated | Doctor and Tool Catalog readiness |

ตรวจสอบรวมด้วยคำสั่งใน README และใช้ generated [TOOL_CONTRACT.md](TOOL_CONTRACT.md) เป็นรายการ tool ปัจจุบัน
