# Human Writing Rules & Style Guide
`human-writing.md` — Standards for Natural, Credible, and Non-AI-Flagged Engineering & Academic Prose

## 1. Core Philosophy: Natural Burstiness & Real Perplexity
Automated AI detectors (ZeroGPT, Copyleaks, Turnitin, GPTZero) calculate two statistical metrics: **Perplexity** (how predictable each subsequent token is) and **Burstiness** (the variation in sentence lengths and syntactic structures). AI default output creates low perplexity (smooth, predictable word choices) and flat burstiness (every sentence is 18–24 words long with balanced subordinate clauses).

To write like a human engineer and researcher:
- **Vary Sentence Length Dramatically:** Follow a short, 4-to-7 word declarative sentence with a longer 25-word compound sentence containing specific technical details. Then drop in an 8-word sentence. Never write three consecutive sentences of similar length.
- **Avoid Predictable Word Sequences:** Do not reach for the statistical default word. Instead of *"serves as a testament to the efficacy of"*, write *"proves"*, *"demonstrates"*, or *"worked reliably in our tests"*.
- **Write from Real Engineering Agency:** Use direct, active voice where humans made choices. Write *"We chose Next.js App Router because..."*, *"Our first attempt failed when..."*, rather than *"The implementation was facilitated through the utilization of..."*.

---

## 2. The Blacklist: Prohibited AI Vocabulary & Clichés
Never use these signature AI words and phrases:

| Category | Forbidden AI Words / Phrases | Natural Human Replacements |
| :--- | :--- | :--- |
| **Puffery & Metaphor** | *testament to, tapestry, landscape, beacon, cornerstone, delving into, multifaceted, transformative, pivotal, paramount, harness, spearhead* | State the concrete fact or metric directly. Drop the metaphor entirely. |
| **Weak Transitions** | *furthermore, moreover, additionally, in conclusion, notably, interestingly, it is worth noting that, needless to say* | Use logical progression, causal links (*Because of this*, *Then*, *Consequently*), or start directly with the subject. |
| **Formulaic Modifiers** | *robust, seamless, comprehensive, cutting-edge, state-of-the-art, indispensable, vital, intricate* | Give the actual property: *fast*, *typed*, *deterministic*, *cached*, *zero-dependency*, or state the number. |
| **Participle Padding** | *underscoring the need for, highlighting the importance of, paving the way for, fostering, culminating in* | Replace with a direct main clause or active finite verb. |
| **Negative Parallelisms** | *It's not just about X, it's about Y; Not only does it do X, but it also does Y* | State what it does plainly. |
| **Tri-colon Stacking** | *efficiency, accuracy, and reliability; diagnosing, treating, and monitoring* | Use two items or pick the one that actually matters. |

---

## 3. Grounding: Concrete Technical Anchors Over Generalities
AI writes in vague generalities because it doesn't build real software. Human engineers write with checkable, specific artifacts:
- Cite **exact file paths**: `lib/geminiVision.ts`, `components/MaskOverlay.tsx`.
- Cite **exact byte offsets and markers**: `bytes 16–24 in the PNG IHDR chunk`, `0xFFD8 JPEG start-of-image`.
- Cite **exact numbers and failure modes**: `an 84-pixel lateral shift`, `641×473 resolution`, `143 test assertions`, `3.6-second latency`.
- Detail **real trade-offs**: Explain why a lightweight binary parser was preferred over importing an entire image manipulation package (preventing bundle bloat and cold-start overhead).

---

## 4. Voice, Tone & Academic Credibility
- **Academic Restraint:** Present claims calmly. Let data, test counts, and error rates speak for themselves without defensive hype or exaggerated breakthroughs.
- **First-Person Grounding in Capstone Projects:** In student project theses, first-person plural (*"we built"*, *"our team tested"*, *"we observed"*) is standard in methodology and evaluation sections, balanced by third-person passive in standard protocols and literature reviews.
- **Precision with Medical Terminology:** Preserve exact clinical and radiologic vocabulary (*contrast-enhanced axial T1-weighted MRI*, *vasogenic edema*, *WHO CNS5*, *RECIST 1.1 unidimensional target lesion criteria*). Do not explain standard domain terminology as if talking to a middle-schooler.

---

## 5. Self-Auditing Checklist Before Finalizing Any Section
1. **Sentence Length Check:** Are any three sentences in a row the same length? (If yes, break one apart or combine another).
2. **AI Words Scan:** Run Ctrl+F for *testament, delve, tapestry, landscape, moreover, furthermore, underscore, pivotal*. Replace every single one.
3. **Passive-to-Active Audit:** Can *"was developed by the authors"* become *"we developed"*? Make the change.
4. **Detector Pre-flight:** Paste sample paragraphs into ZeroGPT / Copyleaks. If flagged above 15% AI, break up the rhythmic cadence and insert concrete engineering decisions.
