# Handoff · Nightly E2E на 6 шардів

| | |
|---|---|
| Дата | 2026-10-31 |
| Виконавець | Claude Code |
| PR | [#290](https://github.com/leusd100/rubikon-build/pull/290), Draft. **Merge — лише з окремого OK Дмитра** (DEC-30) |
| Гілка / base | `ci/nightly-six-shards` від `main` `55fb1806` |
| Змінено | `nightly-full-qa.yml`, `docs/ci-tier-model.md` |
| Не змінено | Тести, visual, Lighthouse |

## Що було
4 шарди при 18 хв: 1/4 доходив до 17,8 хв, 23.10 скасований без звіту.

## Що зроблено
Split і ліміти Main Regression (#232): 6 шардів, 15 хв job, global timeout 12 хв.

## Перевірка
Nightly [41230738483](https://github.com/leusd100/rubikon-build/actions/runs/41230738483): усі E2E зелені, найдовший 11,9 хв; злиття трьох гілок 11,8 хв.

## Еталони
Не змінювались.

## Успадковані червоні перевірки
Lighthouse до merge #288.

## Ризики
Немає нових: той самий режим уже працює в Main Regression.

## Відкат
Revert PR.
