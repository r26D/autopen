# 1. Record strategic decisions

## Date
DATE

## Status

Accepted

## Context

We need to record the strategic design decisions made on this project. Architecture Decision Records (ADRs) capture specific technical choices; Design Decision Records (DDRs) capture design-level patterns. Neither is well-suited for decisions that frame the overall product or technical direction — commitments that constrain and guide many downstream ADRs and DDRs without being specific to any one of them.

## Direction

We will use Strategic Design Records (SDRs), stored in `docs/decisions/sdr/`, numbered sequentially from 0001. SDRs capture strategic commitments: what the team is committed to, what is ruled out, and why — so that future decisions can refer back to them rather than re-litigating the same strategic trade-offs.

## Rationale

Without SDRs, strategic commitments live implicitly in team memory or in long PR discussions. Making them explicit in version control means new team members and AI developers can understand the "why behind the why" without archaeology.

## Downstream implications

All significant ADRs and DDRs that follow from a strategic commitment should link back to the relevant SDR.
