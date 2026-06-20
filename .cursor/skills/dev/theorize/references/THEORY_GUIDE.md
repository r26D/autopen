# THEORY.md Guide

Version: 2026-06-15
Status: Current
Review Trigger: Major conceptual change, subsystem extraction, product pivot, or quarterly review.

---

# Preserving Conceptual Integrity in AI-Native Systems

Inspired by Peter Naur's concept of Programming as Theory Building and adapted for AI-assisted software development.

The purpose of a THEORY.md document is not to explain the implementation.

Its purpose is to preserve the theory of the system:

* what it is,
* why it exists,
* how it sees the world,
* what alternatives were considered,
* what must remain true,
* how it should naturally evolve,
* and how to recognize conceptual drift.

THEORY.md is intended for:

* humans,
* AI agents,
* maintainers,
* orchestration systems,
* future architects,
* and future versions of ourselves.

As software becomes increasingly AI-assisted, implementation becomes easier to change.

Conceptual integrity becomes harder to preserve.

THEORY.md exists to protect that integrity.

---

# Core Principle

## The Theory Is The Asset

Code is not the theory.

Architecture is not the theory.

Documentation is not the theory.

The theory is the shared understanding that allows those artifacts to exist.

THEORY.md exists to preserve that understanding.

If the implementation is rewritten completely, the theory should largely survive.

If the implementation survives but the theory is lost, the system may continue to function while slowly becoming something else.

The goal of THEORY.md is to preserve conceptual continuity across time.

---

# What THEORY.md Is

A THEORY document captures:

* identity,
* purpose,
* worldview,
* conceptual boundaries,
* theories considered,
* constitutional constraints,
* evolutionary direction.

It answers:

> What kind of thing is this?

and

> Why is it this kind of thing instead of another?

and

> What must remain true for it to continue being that thing?

---

# What THEORY.md Is Not

THEORY.md is not:

* a README,
* architecture documentation,
* API documentation,
* onboarding material,
* implementation notes,
* technical specifications,
* ADRs,
* task tracking,
* operational procedures.

Those artifacts explain the current system.

THEORY.md explains the enduring system.

A useful test:

> If the implementation were completely replaced, would this section still be useful?

If not, it probably does not belong in THEORY.md.

---

# Recommended Structure

---

# 1. Identity

## Purpose

Describe what the system fundamentally is.

This should be short, direct, and conceptual.

### Questions

* What kind of thing is this?
* What role does it play?
* What category of problem does it solve?

### Example

> Workbench is an orchestration environment for AI-assisted software development.

---

# 2. Why It Exists

## Purpose

Describe the tension, failure, opportunity, or change that made the project necessary.

This section explains:

> why the project needed to exist at all.

### Questions

* What problem created this system?
* Why were existing approaches insufficient?
* What changed in the world?
* What operational pain made this necessary?

---

# 3. Core Theory

## Purpose

Describe the beliefs embodied by the system.

This is the conceptual heart of the project.

### Questions

* What does this system believe?
* What assumptions does it reject?
* What tradeoffs does it intentionally make?
* What truths does it embody?

### Examples

* Intent should outlive execution.
* Behavioral correctness matters more than implementation correctness.
* Knowledge should remain inspectable by humans.
* Trust emerges from verification rather than authority.

This section should feel philosophical.

It should explain how the system sees the world.

---

# 4. Relationship To The World

## Purpose

Explain the real-world activity being modeled, supported, or augmented.

Software does not exist in isolation.

Every system exists in relationship to people, organizations, workflows, or operational realities.

### Questions

* What real-world process does this system support?
* What human behavior does it augment?
* What organizational capability does it strengthen?
* What reality does it mirror?

---

# 5. Central Metaphors

## Purpose

Describe the metaphors, language, and mental models that organize the project.

Metaphors are not cosmetic.

They shape:

* thinking,
* workflows,
* expectations,
* architecture,
* and operational culture.

### Questions

* What vocabulary should contributors use?
* What metaphors organize the system?
* What language reflects the project's worldview?

---

# 6. Theories Considered

## Purpose

Document important alternative theories that were seriously considered and intentionally not adopted.

This section preserves one of the most valuable forms of knowledge that is often lost over time:

> not what was built,
> but what could have been built.

Many artifacts preserve decisions.

Few preserve the conceptual alternatives that were seriously evaluated.

As teams change and AI agents generate new ideas, previously rejected approaches often reappear because the reasoning behind their rejection has been forgotten.

This section exists to preserve that reasoning.

The goal is not to prove alternative theories were wrong.

The goal is to explain:

* what alternatives were considered,
* why they were attractive,
* why they were not chosen,
* and what assumptions would need to change for them to become preferable.

### Questions

* What alternative theories were seriously considered?
* What advantages did they offer?
* Why were they not chosen?
* What assumptions drove the decision?
* Under what conditions might they become correct?

### Example Format

Alternative Theory:

> Tasks are the primary unit of work.

Advantages:

* Simple to understand.
* Familiar to most organizations.
* Maps naturally to project management systems.

Why Not Chosen:

The system treats intent as the primary unit because tasks are transient while outcomes persist across changing execution strategies.

What Would Change Our Mind:

If execution became highly stable and organizational priorities rarely changed, task-centric coordination might become preferable.

---

Alternative Theory:

> Signing systems should own their signing keys.

Advantages:

* Simpler deployment.
* Fewer moving parts.
* Easier local development.

Why Not Chosen:

The project treats trust generation and key custody as separate concerns. Combining them weakens security boundaries and obscures distinct responsibilities.

What Would Change Our Mind:

A deployment environment with hardware-backed key isolation and extremely constrained operational scope might justify combining these concerns.

---

# Constitutional Layer (Theory Preservation)

The Constitutional Layer exists to protect the theory of the system.

It is not a policy manual.

It is not a governance framework.

It is not a compliance checklist.

It is not a collection of arbitrary rules.

Instead, it serves a specific purpose:

> to preserve the conceptual integrity of the system as it evolves.

The earlier sections describe:

* what the system is,
* why it exists,
* the worldview it embodies,
* and why this theory was chosen over other plausible alternatives.

The Constitutional Layer translates those ideas into durable constraints that help future humans and AI agents recognize:

* what belongs,
* what does not belong,
* what reinforces the theory,
* and what slowly erodes it.

The purpose of these constraints is not to restrict creativity.

The purpose is to prevent conceptual drift.

Every successful system experiences pressure to expand:

* new features,
* adjacent responsibilities,
* operational shortcuts,
* convenience-driven decisions,
* organizational demands.

Many additions appear reasonable in isolation.

Over time, however, they can blur the identity of the system until it becomes difficult to answer:

> What kind of thing is this?

The Constitutional Layer exists to make those pressures visible.

A healthy constitutional statement should always be traceable back to the theory.

Example:

Theory:

> Signing and key custody are separate concerns.

Constitutional Constraint:

> This system shall not permanently store signing keys.

The constitutional rule is not arbitrary.

It exists because it protects the theory.

If a constitutional statement cannot be traced back to the theory, it probably does not belong in THEORY.md.

The theory is primary.

The constitution serves the theory.

A useful mental model is:

Theory explains why.

Constitution preserves what.

Architecture determines how.

Implementation delivers it.

---

# 7. Responsibilities

## Purpose

Define what responsibilities belong to this system.

### Questions

* What does this system own?
* What obligations does it accept?
* What responsibilities naturally belong here?

Responsibilities should reinforce the theory.

---

# 8. Boundaries

## Purpose

Define what responsibilities do not belong here.

Boundaries are often more important than responsibilities.

Many systems decay because they absorb neighboring concerns until their identity becomes unclear.

### Questions

* What neighboring concerns are intentionally excluded?
* What should be delegated elsewhere?
* What misconceptions are likely?

A strong theory is often easiest to understand through what it refuses to become.

---

# 9. Operational Invariants

## Purpose

Define truths that must remain true regardless of implementation.

These are conceptual constraints rather than technical constraints.

### Questions

* What principles are non-negotiable?
* What would indicate conceptual corruption?
* What must remain stable across rewrites?

### Examples

* Findings must remain independently verifiable.
* Signing and key custody remain separate concerns.
* Intent remains distinct from execution.
* Human judgment remains inspectable.

---

# 10. Natural Extensions

## Purpose

Describe what kinds of growth reinforce the theory.

This helps future maintainers and AI agents understand:

> what belongs here.

### Questions

* What adjacent ideas fit naturally?
* What additions deepen the theory?
* What expansions strengthen conceptual integrity?

Natural extensions should make the system more itself.

---

# 11. Theory Violations

## Purpose

Describe changes that may work technically but damage conceptual integrity.

This is one of the most important sections.

### Questions

* What shortcuts undermine the theory?
* What anti-patterns indicate drift?
* What changes would technically succeed while conceptually failing?

### Examples

* Merging unrelated responsibilities.
* Allowing convenience to override core boundaries.
* Replacing explicit intent with hidden automation.
* Absorbing adjacent systems simply because integration is easy.

---

# 12. Signals Of Health

## Purpose

Describe indicators that the theory remains alive.

### Questions

* How can we tell the project is evolving coherently?
* What evidence suggests conceptual integrity remains intact?
* What behaviors indicate healthy evolution?

### Examples

* New capabilities naturally fit existing concepts.
* Vocabulary remains consistent.
* Contributors independently arrive at similar decisions.
* Complexity decreases while capability increases.
* Boundaries become clearer over time rather than blurrier.

---

# Theory Evolution

Theory is not immutable.

A healthy project may evolve its theory as understanding deepens.

Theory changes should be:

* deliberate,
* visible,
* reviewed,
* and documented.

When theory changes, architecture may change.

When architecture changes, theory should not automatically change.

A major theory change may indicate:

* a product pivot,
* a subsystem extraction,
* a new understanding of the problem,
* or the discovery that the original theory was incomplete.

---

# Review Questions

Whenever major changes are proposed, ask:

* Does this belong here?
* Does this reinforce the theory?
* Does this align with the chosen theory rather than a rejected one?
* Does this violate a boundary?
* Does this create conceptual overlap?
* Are we still the same kind of thing afterward?
* Would future maintainers recognize the system from this change?
* Are we solving the same problem more effectively, or a different problem entirely?

---

# Final Principle

A healthy project is not merely:

* functional,
* tested,
* documented,
* deployable,
* maintainable,
* or successful.

A healthy project retains:

> a coherent theory of itself.

THEORY.md exists to preserve that coherence across:

* time,
* teams,
* AI agents,
* architectural evolution,
* organizational change,
* future rewrites,
* and future reinterpretations.

The ultimate goal is not preserving code.

The goal is preserving understanding.
