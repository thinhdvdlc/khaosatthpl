# P1 — Evidence & Gates — __PROJECT__

> BMAD flow: Brief → PRD → Architecture → Stories → Dev → Test → Evidence. Mỗi bước qua **gate**.

## Gate checklist
| Gate | Chủ trì | Artifact | Trạng thái |
|---|---|---|---|
| Brief | BA/PM | `docs/01-problem.md` | ☐ |
| PRD | PM/PO | `docs/02-prd.md` | ☐ |
| Architecture | Architect/Tech Lead | `docs/03-architecture.md` | ☐ |
| Story ready | Tech Lead + Dev | issues/stories GitLab | ☐ |
| Done | Dev + QA + Owner | MR + CI xanh + `evidence/` | ☐ |

## Evidence tự động (từ harness)
- Pipeline map + proof gallery (dashboard :8090) · CI gate log · code review (VNPT-Review-Bot) · MR GitLab.
