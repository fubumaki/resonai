# Note to Cursor Team

Hi team,

Before diving into the attached handoff and roadmap docs, a quick orientation:

* **What this is:** A consolidated M1 → M2 handoff for **Resonai**, our local-first, privacy-first voice feminization trainer. It merges the implementation status reports, UX/curriculum best practices, design patterns, and the forward-looking research/roadmap into one coherent package.

* **How it’s structured:**

  * **12_9_25 Handoff Report** – big-picture narrative (philosophy, principles, current state, curriculum, milestones, open risks).
  * **Cursor M1 Handoff** – the concrete “what shipped” in code (FSM, warmup, reflection/orb, IndexedDB, safety checks), plus dev setup and M2 issue scaffolding.
  * **UX & Curriculum Best Practices** – evidence-based guidance for inclusive design, flow-based AI lessons, adaptive curriculum, community safety, and emotional wellbeing.
  * **Design Patterns Doc** – front-end patterns for visuals (pitch lanes, vowel charts, spectrograms), interactivity (drag-drop, clickable diagrams), and gamified progression.
  * **Implementation Research** – technical feasibility and next steps on DSP (YIN vs CREPE, LPC, spectral tilt), curriculum validation, adaptive planner heuristics, community moderation, accessibility, and ethics.
  * **Roadmap (12 weeks)** – ties it all together into Milestones 1.5–4 with acceptance criteria, risk mitigations, owners, and “what to do this week”.

* **Why it matters:** M1 proved the pipeline and UX tone. M2 is where we add **Pitch Band, Resonance, Prosody, and Orb v2**, making Resonai a real daily trainer. The roadmap pushes us to a **Cohort-ready Beta** in ~12 weeks with privacy defaults, adaptive flows, safety guardrails, and opt-in coach sharing.

* **How to use it:**

  * Treat the GitHub-ready issue list as the tactical entry point.
  * Use the roadmap acceptance criteria as your quality gates.
  * Keep the research docs open as reference whenever implementation tradeoffs arise (e.g., LPC stability vs. fallback vowel classifier).
  * Run mini-cohorts every 2–3 weeks to validate usability, learning outcomes, and safety.

The handoff is meant to be read once for context, then mined as a **living checklist** (issues, acceptance criteria, risks). If anything feels unclear or blocking, flag early—we’d rather adjust course now than in M3.

Thanks for carrying Resonai forward. This is the stage where it starts to feel like a real voice studio for our users.

— Fae
